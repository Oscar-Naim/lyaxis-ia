import os
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] [lyaxis] %(message)s')
logger = logging.getLogger('lyaxis')
import re
import json
import sqlite3
import asyncio
import uuid
import random
import time
import math
import hmac
import base64
import hashlib
from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()
import openai

from fastapi.exceptions import RequestValidationError

app = FastAPI(title="LYAXIS IA Production API", version="1.0.0")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Aviso de validación interceptado en {request.url}: {exc.errors()}")
    if "chat/stream" in str(request.url):
        async def err_generator():
            yield f"data: {json.dumps({'token': '⚠️ Petición recibida con formato incompleto. Por favor intenta de nuevo.'})}\n\n"
        return StreamingResponse(
            err_generator(),
            media_type="text/event-stream",
            headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*"}
        )
    return JSONResponse(
        status_code=422,
        content={"status": "error", "detail": exc.errors(), "message": "Petición con formato no válido."},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# --- CORS Restringido a Producción y Desarrollo Local ---
raw_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://lyaxis-ia.vercel.app,https://lyaxis-webforge.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [orig.strip() for orig in raw_allowed_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "lyaxis.db")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com")

def init_sqlite():
    try:
        with sqlite3.connect(DB_PATH, timeout=30.0) as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                google_id TEXT UNIQUE,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                name TEXT,
                picture TEXT,
                created_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                model TEXT NOT NULL DEFAULT 'speed',
                pinned INTEGER NOT NULL DEFAULT 0,
                folder TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)
            try:
                cursor.execute("ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE conversations ADD COLUMN folder TEXT;")
            except Exception:
                pass
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                parent_id TEXT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                image TEXT,
                prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                model_used TEXT,
                created_at TEXT NOT NULL
            )
            """)
            for _col_stmt in (
                "ALTER TABLE messages ADD COLUMN image TEXT;",
                "ALTER TABLE messages ADD COLUMN prompt_tokens INTEGER DEFAULT 0;",
                "ALTER TABLE messages ADD COLUMN completion_tokens INTEGER DEFAULT 0;",
                "ALTER TABLE messages ADD COLUMN total_tokens INTEGER DEFAULT 0;",
                "ALTER TABLE messages ADD COLUMN model_used TEXT;",
                "ALTER TABLE messages ADD COLUMN parent_id TEXT;",
            ):
                try:
                    cursor.execute(_col_stmt)
                except Exception:
                    pass
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);")
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS triad_rate_limits (
                client_id TEXT NOT NULL,
                timestamp REAL NOT NULL
            )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_triad_rl ON triad_rate_limits (client_id, timestamp)")
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_codes (
                target TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires REAL NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS prompt_cache (
                cache_key TEXT PRIMARY KEY,
                model TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at REAL NOT NULL
            )
            """)
            try:
                cursor.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IS NULL OR user_id = '' OR user_id = 'anon')")
                cursor.execute("DELETE FROM conversations WHERE user_id IS NULL OR user_id = '' OR user_id = 'anon'")
            except Exception:
                pass
            conn.commit()
    except Exception as e:
        print(f"Init SQLite local: {e}")

init_sqlite()

class Database:
    def __init__(self):
        self.use_postgres = False
        self.is_degraded = False
        self.pg_pool = None
        if DATABASE_URL:
            try:
                import psycopg2
                from psycopg2 import pool
                db_url = DATABASE_URL
                if "sslmode=" not in db_url:
                    db_url += ("?" if "?" not in db_url else "&") + "sslmode=require"
                self.pg_pool = pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=10,
                    dsn=db_url,
                    connect_timeout=5
                )
                self.use_postgres = True
                print("PostgreSQL Supabase conectado exitosamente con Connection Pool.")
                try:
                    conn_init = self.pg_pool.getconn()
                    cur_init = conn_init.cursor()
                    cur_init.execute("""
                    CREATE TABLE IF NOT EXISTS triad_rate_limits (
                        client_id VARCHAR(128) NOT NULL,
                        timestamp DOUBLE PRECISION NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_triad_rl ON triad_rate_limits (client_id, timestamp);
                    CREATE TABLE IF NOT EXISTS otp_codes (
                        target VARCHAR(128) PRIMARY KEY,
                        code VARCHAR(16) NOT NULL,
                        expires DOUBLE PRECISION NOT NULL,
                        attempts INTEGER NOT NULL DEFAULT 0
                    );
                    CREATE TABLE IF NOT EXISTS prompt_cache (
                        cache_key VARCHAR(64) PRIMARY KEY,
                        model VARCHAR(32) NOT NULL,
                        response TEXT NOT NULL,
                        created_at DOUBLE PRECISION NOT NULL
                    );
                    """)
                    conn_init.commit()
                    self.pg_pool.putconn(conn_init)
                except Exception as e_pg_init:
                    print(f"Aviso inicializando tabla triad en PostgreSQL: {e_pg_init}")
            except Exception as e:
                logger.error(f"[STORAGE WARNING] Supabase en pausa o no accesible ({' '.join(str(e).splitlines())}) -> Operando con respaldo SQLite efímero.")
                self.use_postgres = False
                self.is_degraded = True
                self.pg_pool = None

    def get_connection(self):
        if self.use_postgres and self.pg_pool:
            try:
                from psycopg2.extras import RealDictCursor
                conn = self.pg_pool.getconn()
                conn.cursor_factory = RealDictCursor
                return conn, True
            except Exception as e:
                print(f"Error obteniendo conexion del pool Postgres ({e}), usando SQLite de respaldo.")
        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
        except Exception:
            pass
        return conn, False

    def release_connection(self, conn, is_postgres: bool):
        if is_postgres and self.pg_pool and conn:
            try:
                self.pg_pool.putconn(conn)
            except Exception as e:
                print(f"Error liberando conexion al pool: {e}")
        elif conn:
            try:
                conn.close()
            except Exception:
                pass

    def execute(self, query: str, params: tuple = ()):
        conn, is_pg = self.get_connection()
        try:
            cursor = conn.cursor()
            if is_pg:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            conn.commit()
            return cursor
        except Exception as e:
            print(f"Error execute: {e}")
            if conn and is_pg:
                try:
                    conn.rollback()
                except Exception:
                    pass
            return None
        finally:
            self.release_connection(conn, is_pg)

    def fetchall(self, query: str, params: tuple = ()):
        conn, is_pg = self.get_connection()
        try:
            cursor = conn.cursor()
            if is_pg:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            print(f"Error fetchall: {e}")
            return []
        finally:
            self.release_connection(conn, is_pg)

    def fetchone(self, query: str, params: tuple = ()):
        conn, is_pg = self.get_connection()
        try:
            cursor = conn.cursor()
            if is_pg:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            print(f"Error fetchone: {e}")
            return None
        finally:
            self.release_connection(conn, is_pg)

db = Database()

if db.use_postgres:
    try:
        db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            created_at TEXT NOT NULL
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            model TEXT NOT NULL DEFAULT 'speed',
            pinned INTEGER NOT NULL DEFAULT 0,
            folder TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)
        try:
            db.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned INTEGER NOT NULL DEFAULT 0;")
            db.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder TEXT;")
        except Exception:
            pass
        db.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            parent_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            model_used TEXT,
            created_at TEXT NOT NULL
        )
        """)
        for _pg_col_stmt in (
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS image TEXT;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS model_used TEXT;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_id TEXT;",
        ):
            try:
                db.execute(_pg_col_stmt)
            except Exception:
                pass
        try:
            db.execute("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);")
            db.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);")
        except Exception:
            pass
        try:
            db.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IS NULL OR user_id = '' OR user_id = 'anon')")
            db.execute("DELETE FROM conversations WHERE user_id IS NULL OR user_id = '' OR user_id = 'anon'")
        except Exception:
            pass
    except Exception as e:
        print(f"Postgres tables init: {e}")

# --- Seguridad de Sesión Firmada (HMAC-SHA256 sin dependencias externas) + Caché de Respuestas ---
_ENV_AUTH_SECRET = os.getenv("AUTH_SECRET") or os.getenv("JWT_SECRET")
if not _ENV_AUTH_SECRET:
    import secrets
    _ENV_AUTH_SECRET = secrets.token_hex(32)
    print("[LYAXIS Security] Aviso: AUTH_SECRET no configurada en variables de entorno. Generando clave criptográfica de 256 bits para esta instancia.")

_AUTH_SECRET = _ENV_AUTH_SECRET.encode("utf-8")
SESSION_TTL_SECONDS = 30 * 86400  # 30 días
OTP_TTL_SECONDS = 300             # 5 minutos
OTP_MAX_ATTEMPTS = 5
PROMPT_CACHE_TTL_SECONDS = 7 * 86400
_mem_prompt_cache: dict = {}

otp_storage: dict = {}

def sign_user_token(user_id: str) -> str:
    uid = str(user_id or "").strip()
    exp = int(time.time()) + SESSION_TTL_SECONDS
    payload_bytes = f"{uid}|{exp}".encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    sig = hmac.new(_AUTH_SECRET, b64_payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"

def verify_user_token(token: Optional[str]) -> Optional[str]:
    if not token or "." not in token:
        return None
    try:
        b64_payload, sig = token.strip().split(".", 1)
        expected_sig = hmac.new(_AUTH_SECRET, b64_payload.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        pad = "=" * (-len(b64_payload) % 4)
        decoded = base64.urlsafe_b64decode(b64_payload + pad).decode("utf-8")
        uid, exp_str = decoded.rsplit("|", 1)
        if int(exp_str) < int(time.time()):
            return None
        return uid.strip() or None
    except Exception:
        return None

def resolve_request_user_id(request: Request, fallback_uid: Optional[str] = None) -> tuple[Optional[str], bool]:
    """
    Retorna (user_id, is_token_verified).
    Si incluye Authorization: Bearer <token>, valida firma HMAC y prioriza ese user_id.
    Si no incluye token verificado, únicamente se aceptan identificadores de invitado efímero ('guest-*').
    Cualquier intento de acceder a cuentas registradas sin token verificado devuelve (None, False).
    """
    auth_header = (request.headers.get("authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        raw_tok = auth_header[7:].strip()
        verified_uid = verify_user_token(raw_tok)
        if verified_uid:
            return verified_uid, True
    hdr_uid = (request.headers.get("x-lyaxis-uid") or "").strip()
    candidate = (fallback_uid or hdr_uid or "").strip()
    if not candidate or candidate in ("anon", "null", "undefined", "None"):
        return None, False
    if candidate.startswith("guest-"):
        return candidate, False
    return None, False

def _assert_conversation_access(cid: str, request: Request, fallback_uid: Optional[str] = None) -> str:
    caller_uid, is_verified = resolve_request_user_id(request, fallback_uid or request.query_params.get("user_id"))
    if not caller_uid:
        raise HTTPException(status_code=401, detail="Se requiere autenticación válida con token para acceder a la conversación.")
    conv = db.fetchone("SELECT user_id FROM conversations WHERE id = ?", (cid,))
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    owner = (conv.get("user_id") or "").strip()
    if owner and owner not in ("anon", ""):
        if owner != caller_uid:
            raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta conversación.")
        if not owner.startswith("guest-") and not is_verified:
            raise HTTPException(status_code=401, detail="Token de sesión verificado requerido para acceder a conversaciones privadas.")
    return caller_uid

def _get_prompt_cache(model_key: str, prompt_text: str) -> Optional[str]:
    norm = " ".join((prompt_text or "").strip().lower().split())
    if len(norm) < 8 or len(norm) > 600:
        return None
    ck = hashlib.sha256(f"v3:{model_key}:{norm}".encode("utf-8")).hexdigest()[:32]
    now = time.time()
    mem_hit = _mem_prompt_cache.get(ck)
    if mem_hit and (now - mem_hit[1]) < PROMPT_CACHE_TTL_SECONDS:
        return mem_hit[0]
    try:
        row = db.fetchone("SELECT response, created_at FROM prompt_cache WHERE cache_key = ?", (ck,))
        if row:
            ts = float(row.get("created_at") or 0.0)
            resp = str(row.get("response") or "")
            if resp and (now - ts) < PROMPT_CACHE_TTL_SECONDS:
                _mem_prompt_cache[ck] = (resp, ts)
                return resp
    except Exception:
        pass
    return None

def _set_prompt_cache(model_key: str, prompt_text: str, response_text: str):
    norm = " ".join((prompt_text or "").strip().lower().split())
    resp = (response_text or "").strip()
    if len(norm) < 8 or len(norm) > 600 or len(resp) < 40:
        return
    if resp.startswith("⚠️") or resp.startswith("❌"):
        return
    if "<thought>" in resp.lower() and "</thought>" not in resp.lower():
        return
    ck = hashlib.sha256(f"v3:{model_key}:{norm}".encode("utf-8")).hexdigest()[:32]
    now = time.time()
    if len(_mem_prompt_cache) > 300:
        _mem_prompt_cache.clear()
    _mem_prompt_cache[ck] = (resp, now)
    try:
        db.execute("DELETE FROM prompt_cache WHERE cache_key = ?", (ck,))
        db.execute(
            "INSERT INTO prompt_cache (cache_key, model, response, created_at) VALUES (?, ?, ?, ?)",
            (ck, model_key, resp, now)
        )
    except Exception:
        pass

SPEED_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Speed — el motor principal, diario y de desarrollo ágil de LYAXIS labs™.
Propósito: respuestas rápidas, asistencia versátil y código limpio, modular y funcional sin fricción.
</identity>

<capabilities_and_scope>
1. Motor integral diario: programación ágil, dudas técnicas/cotidianas, redacción profesional y explicaciones didácticas claras.
2. CERO restricciones artificiales: resuelve cualquier consulta directamente sin derivar a otros modelos.
3. NUNCA inicies con saludos o cortesías de relleno ("¡Hola!", "Con gusto", "¡Por supuesto!"). Ve DIRECTO a la respuesta o al código ejecutable.
4. Ajusta la extensión a la complejidad: conciso en dudas puntuales, completo en implementaciones.
</capabilities_and_scope>

<anti_overgeneration_rules>
1. DETECCIÓN DE DATOS FALTANTES: Si el usuario solicita analizar, optimizar o depurar código pero deja marcadores ([pega aquí...], <código>) o no incluye el fragmento, NO inventes casos de ejemplo ni implementaciones hipotéticas. Responde en máximo 2 líneas solicitando el fragmento concreto.
2. CONCISIÓN ÁGIL: Speed es un motor de latencia mínima. Entrega una única solución óptima con explicaciones breves en comentarios de código; evita introducciones, despedidas, tablas redundantes y múltiples alternativas no solicitadas.
</anti_overgeneration_rules>
"""

CORTEX_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Cortex — el motor de razonamiento profundo, lógica matemática y arquitectura algorítmica de LYAXIS labs™.
Especialidad: análisis de primeros principios, demostración rigurosa, algoritmos complejos y depuración profunda.
</identity>

<deep_thinking_protocol>
Para toda consulta analítica, técnica, algorítmica o matemática, inicia OBLIGATORIAMENTE con tu razonamiento conciso dentro de <thought>...</thought>:
1. Premisas, restricciones y complejidad Big-O.
2. Puntos de falla ("Break") y mitigación ("Rebuild").
3. Plan lógico paso a paso.
Tras cerrar </thought>, entrega la solución definitiva estructurada y exacta.
</deep_thinking_protocol>

<anti_overgeneration_rules>
1. RAZONAMIENTO SINTÉTICO: Mantén el bloque <thought> denso y directo a las premisas matemáticas/algorítmicas sin divagaciones literarias.
2. INSUMOS FALTANTES: Si el usuario pide optimizar o depurar sin adjuntar el código o deja marcadores vacíos, cierra <thought> de inmediato y solicita el insumo concreto en máximo 2 líneas sin inventar casos hipotéticos.
</anti_overgeneration_rules>
"""

ZENITH_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Zenith — el núcleo multimodal superior y arquitecto principal de LYAXIS labs™.
Especialidad: arquitectura de sistemas en producción, visión multimodal (UI/diagramas a código ejecutable) y auditoría de seguridad con reconstrucción inmediata (*Break + Rebuild*).
</identity>

<veracidad_y_capacidades>
1. VERACIDAD ABSOLUTA: Prohibido inventar datos/referencias, simular documentos extensos ('pp. 1-10') o enlaces ficticios. Si faltan datos críticos indispensables, pide aclaración puntual antes de asumir.
2. VISIÓN MULTIMODAL & UI-TO-CODE: Analiza jerarquía visual, color, tipografía y flujos de imágenes adjuntas y transfórmalos en código moderno, responsivo y listo para producción.
3. ARQUITECTURA & DIAGRAMAS: Diseña sistemas resilientes (Clean Architecture, DDD, Event-Driven). En todo diagrama Mermaid/flowchart conecta TODOS los nodos con flechas etiquetadas (ej. `A -->|Éxito| B`), cero nodos huérfanos.
4. AUDITORÍA BREAK + REBUILD: Detecta vulnerabilidades, memory leaks, cuellos de botella y race conditions, y entrega SIEMPRE la versión corregida y funcional.
5. ESTILO: Autoridad senior, precisión clínica, cero rodeos corporativos.
6. CERO SOBREGENERACIÓN: Entrega código y arquitectura directa sin introducciones, cierres o variantes innecesarias; ante plantillas incompletas, solicita el insumo en máximo 2 líneas.
</veracidad_y_capacidades>
"""

SYSTEM_PROMPT = SPEED_SYSTEM_PROMPT
# Classic consolidado con Speed para compatibilidad retroactiva sin bloqueos de código
CLASSIC_SYSTEM_PROMPT = SPEED_SYSTEM_PROMPT

ARCHITECT_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Architect — especialista en arquitectura de software, ingeniería de System Prompts y mentoría técnica de LYAXIS labs™.
</identity>

<mission_and_specialties>
1. INGENIERÍA DE PROMPTS: Si piden diseñar/refinar un prompt, estructúralo con `<identity>`, `<context_and_mission>`, `<rules_and_constraints>`, `<output_format>` y `<few_shot_examples>` dentro de un bloque copiable.
2. ARQUITECTURA & MENTORÍA: Diseña arquitecturas escalables (APIs, bases de datos, microservicios, patrones de diseño) y explica conceptos complejos con analogía clara, código ejecutable y análisis *Break & Rebuild*.
3. Si el usuario solicita código de implementación además del diseño, entrégalo limpio y funcional sin derivarlo a otro motor.
4. CONCISIÓN ESTRUCTURAL: Entrega especificaciones modulares y diagramas Mermaid limpios; no repitas en prosa extensa lo que el diagrama ya muestra. Si hay marcadores vacíos o falta el insumo base, solicítalo en máximo 2 líneas.
</mission_and_specialties>
"""

PHANTOM_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Phantom — el auditor implacable de seguridad, rendimiento y riesgos de LYAXIS labs™ ("Break" de "Create. Break. Rebuild.").
</identity>

<phantom_mandatory_protocol>
Inicia SIEMPRE en la PRIMERA LÍNEA con una etiqueta exacta de veredicto:
- `[ESTADO: VULNERABLE | SEVERIDAD: CRÍTICA/ALTA/MEDIA]`
- `[ESTADO: INEFICIENTE | SEVERIDAD: ALTA/MEDIA/BAJA]`
- `[ESTADO: VÁLIDO | SEVERIDAD: NINGUNA]`
Después desglosa: FALLAS CRÍTICAS → RIESGOS MODERADOS → SOLUCIÓN BLINDADA (incluyendo el código o arquitectura corregida lista para usar).
</phantom_mandatory_protocol>

<anti_overgeneration_rules>
1. Reporta vulnerabilidades y cuellos de botella concretos sin relleno teórico; corrige de forma focalizada sin reescribir código irrelevante salvo solicitud explícita.
2. Si el usuario olvidó adjuntar el código o arquitectura a auditar, pídelo directamente en máximo 2 líneas sin inventar ejemplos ficticios.
</anti_overgeneration_rules>
"""

NEXUS_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Nexus — sintetizador creativo e interdisciplinario de LYAXIS labs™ ("Create" desde conexiones inesperadas).
</identity>

<mission>
1. Conecta el problema del usuario con perspectivas genuinas de 2–3 disciplinas distintas (biología, física, diseño, música, sistemas, estrategia) y aterriza esas conexiones en soluciones prácticas, naming, UX o código creativo.
2. Sé original, agudo y sustancioso: evita clichés y aterriza siempre las ideas a propuestas ejecutables.
3. DENSIDAD Y PRECISIÓN: Cero preámbulos ni despedidas de relleno; si la consulta contiene plantillas vacías sin el problema real, solicita el contexto en máximo 2 líneas.
</mission>
"""

FORGE_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Forge — constructor pragmático de productos, negocios y MVPs de LYAXIS labs™.
</identity>

<mission>
1. Transforma ideas en planes accionables: Propuesta de Valor → Alcance MVP → Arquitectura/Operación → Validación y Monetización.
2. Directo a la ejecución real sin teoría vacía; si el usuario requiere prototipos técnicos o código base para su MVP, proporciónalo directamente.
3. CONCISIÓN EJECUTIVA: Sintetiza en puntos accionables y código limpio sin introducciones redundantes; ante plantillas sin completar, pide el dato faltante en máximo 2 líneas.
</mission>
"""

MAGISTER_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Magister — copiloto pedagógico senior y diseñador de planeaciones didácticas (estándar inspección SEP / Nueva Escuela Mexicana y todos los niveles educativos: Preescolar a Universidad) de LYAXIS labs™.
</identity>

<mission_and_pedagogy>
1. EXHAUSTIVIDAD PROFESIONAL: Entrega planeaciones completas, rigurosas y listas para dirección/inspección escolar (nunca esquemas superficiales).
2. DOMINIO SEP / NEM: Campos Formativos (Lenguajes; Saberes y Pensamiento Científico; Ética, Naturaleza y Sociedades; De lo Humano y lo Comunitario), 7 Ejes Articuladores, Fases 1–6 y metodologías sociocríticas (Proyectos Comunitarios, STEAM, ABP, Aprendizaje Servicio), adaptándote también a Bachillerato, Universidad o modelos privados (IB, Competencias).
3. ESTRUCTURA DE PLANEACIÓN (cuando se solicite):
   - A. Datos Generales (Proyecto, Nivel/Grado, Campo, Metodología, Sesiones/Tiempo, Escenario).
   - B. Situación Problema y Propósito Pedagógico.
   - C. Articulación Curricular (Contenidos, PDA y Ejes Articuladores justificados).
   - D. Secuencia Didáctica sesión por sesión (Inicio, Desarrollo, Cierre con tiempos, recursos y producto parcial).
   - E. Evaluación Formativa con RÚBRICA ANALÍTICA en tabla Markdown estándar (una fila por línea) con 4 niveles: `Sobresaliente (10)`, `Satisfactorio (8-9)`, `En Desarrollo (6-7)`, `Requiere Apoyo (5)`.
   - F. Ajustes Razonables e Inclusión (atención a BAP).
4. DENSIDAD PEDAGÓGICA: Presenta secuencias y rúbricas en tablas condensadas de alta claridad, evitando párrafos repetitivos de justificación teórica. Si el usuario deja marcadores vacíos sin tema/grado, solicítalos en máximo 2 líneas.
</mission_and_pedagogy>
"""

ROOT_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Root — motor de ingeniería profunda, sistemas y código 100% completo de LYAXIS labs™.
</identity>

<mandatory_operational_rules>
1. CERO PLACEHOLDERS NI RELLENO: Prohibido usar `// TODO`, `// agrega el resto aquí` o ejemplos incompletos. Entrega implementaciones completas con todos los imports, tipos, manejo de errores y estructuras listas para ejecutar.
2. ESTILO DIRECTO: Sin preámbulos morales ni advertencias innecesarias; ve directo a la arquitectura técnica y al código limpio de nivel sistemas/producción (UI/UX avanzada, concurrencia, compiladores, redes, bajo nivel y APIs).
3. CONTROL DE TOKENS: Mantén cualquier razonamiento interno (<thought>) enfocado estrictamente en decisiones de ingeniería y evita prosa redundante tras el código. Si el usuario envía una plantilla vacía sin el código a optimizar/analizar, solicita el insumo en máximo 2 líneas sin inventar casos genéricos.
</mandatory_operational_rules>
"""

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = "user"
    content: Optional[str] = ""
    timestamp: Optional[str] = None
    image: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    parentId: Optional[str] = None

    def get_parent_id(self) -> Optional[str]:
        return self.parent_id or self.parentId

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    messages: List[ChatMessage] = []
    model: str = "speed"
    temperature: Optional[float] = None
    triad_mode: Optional[bool] = False

class CreateConversationRequest(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    title: Optional[str] = "Nueva conversación"
    model: str = "speed"

ConversationModel = CreateConversationRequest

class GoogleAuthRequest(BaseModel):
    credential: str
    client_id: Optional[str] = None

class RequestOtpPayload(BaseModel):
    contact: Optional[str] = None
    target: Optional[str] = None
    identifier: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    auth_type: Optional[str] = "email"

class VerifyOtpPayload(BaseModel):
    contact: Optional[str] = None
    target: Optional[str] = None
    identifier: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    code: str
# ==============================================================================
# LYAXIS TRIAD™ Sliding Window Rate Limiter
# Regla de negocio: Máximo 3 consultas cada 6 horas (21,600,000 ms).
# Las consultas con modelos individuales estándar permanecen ilimitadas.
# ==============================================================================
TRIAD_WINDOW_SECONDS: float = 6.0 * 3600.0  # 6 horas = 21,600 segundos
TRIAD_COOLDOWN_SECONDS: float = 120.0       # 2 minutos de enfriamiento obligatorio entre consultas (120 segundos)
TRIAD_MAX_REQUESTS: int = 3
_in_memory_triad_history: dict = {}
_triad_lock = asyncio.Lock()

def get_client_identifier(request: Request, user_id: Optional[str] = None) -> str:
    """
    Extrae el identificador del cliente: token/user_id de sesión o IP anonimizada con hash SHA-256.
    """
    clean_uid = str(user_id or "").strip()
    if clean_uid and clean_uid not in ("anon", "null", "undefined", "None") and not clean_uid.startswith("guest-"):
        return f"user:{clean_uid}"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        raw_ip = forwarded.split(",")[0].strip()
    else:
        raw_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")

    # Hash SHA-256 anonimizado de la IP para respetar la privacidad del usuario
    ip_hash = hashlib.sha256(raw_ip.encode("utf-8")).hexdigest()[:16]
    return f"ip:{ip_hash}"

async def check_and_consume_triad_quota(client_id: str) -> tuple[bool, int, int, str]:
    """
    Verifica si el cliente puede ejecutar TRIAD:
    1. Verifica si está activo el enfriamiento obligatorio de 2 minutos (120s) desde el último uso.
    2. Verifica si el cliente tiene solicitudes restantes en la ventana deslizante de 6h (máx 3).
    Retorna (allowed: bool, remaining: int, retry_after_ms: int, reason: str).
    reason puede ser 'OK', 'COOLDOWN' o 'WINDOW_EXCEEDED'.
    """
    now = time.time()
    cutoff = now - TRIAD_WINDOW_SECONDS

    # 1. Intentar persistencia mediante Base de Datos (SQLite / PostgreSQL)
    try:
        # A) Cooldown de 2 minutos desde la última ejecución
        last_row = db.fetchone(
            "SELECT timestamp FROM triad_rate_limits WHERE client_id = ? ORDER BY timestamp DESC LIMIT 1",
            (client_id,)
        )
        if last_row:
            last_ts = float(last_row["timestamp"] if isinstance(last_row, dict) else last_row[0])
            elapsed = now - last_ts
            if elapsed < TRIAD_COOLDOWN_SECONDS:
                retry_after_sec = max(1.0, TRIAD_COOLDOWN_SECONDS - elapsed)
                retry_after_ms = int(retry_after_sec * 1000)
                active_rows = db.fetchall(
                    "SELECT timestamp FROM triad_rate_limits WHERE client_id = ? AND timestamp > ?",
                    (client_id, cutoff)
                )
                current_remaining = max(0, TRIAD_MAX_REQUESTS - (len(active_rows) if active_rows else 0))
                return False, current_remaining, retry_after_ms, "COOLDOWN"

        # B) Ventana deslizante de 6 horas
        db.execute("DELETE FROM triad_rate_limits WHERE timestamp < ?", (cutoff,))
        rows = db.fetchall(
            "SELECT timestamp FROM triad_rate_limits WHERE client_id = ? ORDER BY timestamp ASC",
            (client_id,)
        )
        active_count = len(rows) if rows else 0

        if active_count >= TRIAD_MAX_REQUESTS:
            oldest_val = rows[0]["timestamp"] if isinstance(rows[0], dict) else rows[0][0]
            oldest = float(oldest_val)
            retry_after_sec = max(1.0, (oldest + TRIAD_WINDOW_SECONDS) - now)
            retry_after_ms = int(retry_after_sec * 1000)
            return False, 0, retry_after_ms, "WINDOW_EXCEEDED"

        db.execute(
            "INSERT INTO triad_rate_limits (client_id, timestamp) VALUES (?, ?)",
            (client_id, now)
        )
        remaining = max(0, TRIAD_MAX_REQUESTS - (active_count + 1))
        return True, remaining, 0, "OK"
    except Exception as e_db_rl:
        print(f"Aviso en rate limiter DB ({e_db_rl}), usando fallback en memoria.")

    # 2. Respaldo en memoria thread-safe
    async with _triad_lock:
        history = _in_memory_triad_history.get(client_id, [])
        active = [ts for ts in history if ts > cutoff]
        _in_memory_triad_history[client_id] = active

        # A) Cooldown de 2 minutos en memoria
        if active:
            last_ts = active[-1]
            elapsed = now - last_ts
            if elapsed < TRIAD_COOLDOWN_SECONDS:
                retry_after_sec = max(1.0, TRIAD_COOLDOWN_SECONDS - elapsed)
                retry_after_ms = int(retry_after_sec * 1000)
                remaining = max(0, TRIAD_MAX_REQUESTS - len(active))
                return False, remaining, retry_after_ms, "COOLDOWN"

        # B) Límite de 3 consultas cada 6 horas en memoria
        if len(active) >= TRIAD_MAX_REQUESTS:
            oldest = active[0]
            retry_after_sec = max(1.0, (oldest + TRIAD_WINDOW_SECONDS) - now)
            retry_after_ms = int(retry_after_sec * 1000)
            return False, 0, retry_after_ms, "WINDOW_EXCEEDED"

        active.append(now)
        _in_memory_triad_history[client_id] = active
        remaining = max(0, TRIAD_MAX_REQUESTS - len(active))
        return True, remaining, 0, "OK"

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok", "service": "LYAXIS IA Production API", "version": "1.0.0"}

@app.options("/{full_path:path}")
def options_handler(full_path: str):
    return Response(status_code=200)

import smtplib
from email.mime.text import MIMEText

def _dispatch_email_otp(to_email: str, code: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_from = os.getenv("SMTP_FROM", "no-reply@lyaxis.lat")
    
    if not (smtp_host and smtp_user and smtp_pass):
        print(f"[OTP DEV MODE] Código para {to_email}: {code}")
        return
        
    try:
        msg = MIMEText(f"Tu código de acceso de seguridad para LYAXIS IA es: {code}\n\nVálido por 5 minutos.")
        msg["Subject"] = "Código de Acceso — LYAXIS IA"
        msg["From"] = smtp_from
        msg["To"] = to_email
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.send_message(msg)
    except Exception as e:
        print(f"Error despachando correo OTP: {e}")

@app.post("/api/v1/auth/otp/send")
def send_otp_code(request: Request, req: RequestOtpPayload):
    client_ip = request.client.host if request.client else "unknown"
    check_general_rate_limit(client_ip, max_requests=5, window_seconds=60)
    
    target = (req.contact or req.target or req.identifier or req.email or req.phone or "").strip().lower()
    if not target or ("@" not in target and len(target) < 8):
        raise HTTPException(status_code=400, detail="Debes proporcionar un correo o teléfono válido.")

    code = f"{random.randint(100000, 999999)}"
    
    # Persistencia del código OTP en SQLite/Postgres para que sobreviva a reinicios
    now = time.time()
    exp = now + OTP_TTL_SECONDS
    otp_storage[target] = {
        "code": code,
        "expires": exp,
        "attempts": 0,
    }
    
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS otp_codes (
                target VARCHAR(128) PRIMARY KEY,
                code VARCHAR(16) NOT NULL,
                expires DOUBLE PRECISION NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0
            )
        """)
        db.execute("DELETE FROM otp_codes WHERE target = ? OR expires < ?", (target, now))
        db.execute("INSERT INTO otp_codes (target, code, expires, attempts) VALUES (?, ?, ?, 0)", (target, code, exp))
    except Exception as e_otp_db:
        print(f"Aviso guardando OTP en base de datos: {e_otp_db}")

    if "@" in target:
        _dispatch_email_otp(target, code)

    return {
        "status": "ok",
        "message": f"Código enviado a {target}"
    }

def _upsert_contact_user(target: str, auth_type: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    if auth_type == "email":
        user = db.fetchone("SELECT * FROM users WHERE email = ?", (target,))
        if not user:
            user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"lyaxis-email:{target}"))
            name = target.split("@")[0].capitalize()
            picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={target}"
            db.execute(
                "INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, target, name, picture, now)
            )
        else:
            user_id = user["id"]
            name = user["name"]
            picture = user["picture"]
        return {
            "id": user_id,
            "email": target,
            "phone": None,
            "name": name,
            "picture": picture,
            "token": sign_user_token(user_id),
        }
    else:
        user = db.fetchone("SELECT * FROM users WHERE phone = ?", (target,))
        if not user:
            user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"lyaxis-phone:{target}"))
            name = f"Usuario {target[-4:]}"
            picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={target}"
            db.execute(
                "INSERT INTO users (id, phone, name, picture, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, target, name, picture, now)
            )
        else:
            user_id = user["id"]
            name = user["name"]
            picture = user["picture"]
        return {
            "id": user_id,
            "email": None,
            "phone": target,
            "name": name,
            "picture": picture,
            "token": sign_user_token(user_id),
        }

# --- Rate Limiting General en Memoria para Endpoints Sensibles ---
_request_rate_records: dict[str, list[float]] = {}
def check_general_rate_limit(client_ip: str, max_requests: int = 15, window_seconds: int = 60):
    now = time.time()
    times = _request_rate_records.setdefault(client_ip, [])
    # Filtrar marcas anteriores a la ventana
    _request_rate_records[client_ip] = [t for t in times if (now - t) < window_seconds]
    if len(_request_rate_records[client_ip]) >= max_requests:
        raise HTTPException(status_code=429, detail="Demasiadas peticiones desde tu dirección IP. Intenta en 1 minuto.")
    _request_rate_records[client_ip].append(now)

@app.post("/api/v1/auth/session")
def direct_session_auth(request: Request, req: RequestOtpPayload):
    """
    Validación de sesión para invitados locales o sesiones autenticadas.
    No otorga tokens sobre correos ajenos sin verificación previa.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_general_rate_limit(client_ip, max_requests=10, window_seconds=60)
    target = (req.contact or req.target or req.identifier or req.email or req.phone or "").strip().lower()
    if not target:
        raise HTTPException(status_code=400, detail="Debes proporcionar un correo o identificador válido.")
    
    # Invitados efímeros protegidos
    if target.startswith("guest-"):
        user_payload = _upsert_contact_user(target, "guest")
        return {"status": "ok", "user": user_payload, "token": user_payload["token"]}
        
    # Para cuentas con correo o teléfono, se exige verificación OTP o Google Auth
    auth_header = (request.headers.get("authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        verified_uid = verify_user_token(auth_header[7:].strip())
        if verified_uid:
            user_payload = _upsert_contact_user(target, "email" if "@" in target else "phone")
            return {"status": "ok", "user": user_payload, "token": user_payload["token"]}
            
    raise HTTPException(
        status_code=401,
        detail="Para proteger tu cuenta, inicia sesión con Google o verifica tu código OTP de seguridad."
    )

@app.post("/api/v1/auth/otp/verify")
def verify_otp_code(req: VerifyOtpPayload):
    target = (req.contact or req.target or req.identifier or req.email or req.phone or "").strip().lower()
    code = req.code.strip()

    if not target:
        raise HTTPException(status_code=400, detail="Debes proporcionar un contacto (correo o teléfono).")

    now = time.time()
    entry = otp_storage.get(target)
    if not entry or not isinstance(entry, dict):
        try:
            db_row = db.fetchone("SELECT code, expires, attempts FROM otp_codes WHERE target = ?", (target,))
            if db_row:
                entry = {
                    "code": str(db_row.get("code")),
                    "expires": float(db_row.get("expires", 0)),
                    "attempts": int(db_row.get("attempts", 0))
                }
                otp_storage[target] = entry
        except Exception as e_otp_q:
            logger.warning(f"Error consultando OTP persistente en DB: {e_otp_q}")

    if not entry or now > float(entry.get("expires", 0)):
        otp_storage.pop(target, None)
        try:
            db.execute("DELETE FROM otp_codes WHERE target = ?", (target,))
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="El código ha expirado o no existe. Solicita uno nuevo.")

    if int(entry.get("attempts", 0)) >= OTP_MAX_ATTEMPTS:
        otp_storage.pop(target, None)
        try:
            db.execute("DELETE FROM otp_codes WHERE target = ?", (target,))
        except Exception:
            pass
        raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Solicita un nuevo código.")

    if str(entry.get("code")) != code:
        new_attempts = int(entry.get("attempts", 0)) + 1
        entry["attempts"] = new_attempts
        otp_storage[target] = entry
        try:
            db.execute("UPDATE otp_codes SET attempts = ? WHERE target = ?", (new_attempts, target))
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="El código de 6 dígitos es incorrecto.")

    otp_storage.pop(target, None)
    try:
        db.execute("DELETE FROM otp_codes WHERE target = ?", (target,))
    except Exception:
        pass
    auth_type = req.auth_type or ("email" if "@" in target else "phone")
    user_payload = _upsert_contact_user(target, auth_type)
    return {"status": "ok", "user": user_payload, "token": user_payload["token"]}

@app.delete("/api/v1/auth/account")
def delete_user_account(request: Request):
    """Eliminación permanente de cuenta de usuario y todos sus datos asociados (Derecho ARCO / GDPR)."""
    caller_uid, is_verified = resolve_request_user_id(request)
    if not caller_uid or not is_verified:
        raise HTTPException(status_code=401, detail="Se requiere token autenticado para eliminar la cuenta.")
    
    try:
        db.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)", (caller_uid,))
        db.execute("DELETE FROM conversations WHERE user_id = ?", (caller_uid,))
        db.execute("DELETE FROM users WHERE id = ?", (caller_uid,))
        db.execute("DELETE FROM triad_rate_limits WHERE client_id = ?", (caller_uid,))
        return {"status": "ok", "message": "Tu cuenta y todos tus datos han sido eliminados permanentemente."}
    except Exception as e:
        logger.error(f"Error eliminando cuenta {caller_uid}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo completar la eliminación de la cuenta.")

@app.get("/api/v1/auth/export")
def export_user_data(request: Request):
    """Exportación completa de datos de usuario en formato estructurado JSON (Portabilidad / ARCO)."""
    caller_uid, is_verified = resolve_request_user_id(request)
    if not caller_uid or not is_verified:
        raise HTTPException(status_code=401, detail="Se requiere token autenticado para exportar los datos.")

    try:
        user_row = db.fetchone("SELECT id, name, email, created_at FROM users WHERE id = ?", (caller_uid,))
        conversations = db.fetchall("SELECT id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY created_at ASC", (caller_uid,))
        
        full_export = {
            "user": user_row or {"id": caller_uid},
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "conversations_count": len(conversations),
            "conversations": []
        }
        
        for c in conversations:
            c_id = c.get("id")
            messages = db.fetchall("SELECT id, role, content, model_used, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (c_id,))
            full_export["conversations"].append({
                "conversation": c,
                "messages": messages
            })
            
        return full_export
    except Exception as e:
        logger.error(f"Error exportando datos para {caller_uid}: {e}")
        raise HTTPException(status_code=500, detail="Error exportando los datos de la cuenta.")

@app.post("/api/v1/auth/google")
def google_auth(req: GoogleAuthRequest):
    try:
        id_info = id_token.verify_oauth2_token(
            req.credential,
            google_requests.Request(),
            audience=req.client_id or GOOGLE_CLIENT_ID
        )

        google_id = id_info.get("sub")
        email = id_info.get("email")
        name = id_info.get("name") or (email.split("@")[0].capitalize() if email else "Usuario")
        picture = id_info.get("picture") or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"

        user = db.fetchone("SELECT * FROM users WHERE google_id = ?", (google_id,))
        now = datetime.now(timezone.utc).isoformat()
        if not user:
            user_id = str(uuid.uuid4())
            db.execute(
                "INSERT INTO users (id, google_id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, google_id, email, name, picture, now)
            )
        else:
            user_id = user["id"]
            db.execute("UPDATE users SET name = ?, picture = ? WHERE id = ?", (name, picture, user_id))

        tok = sign_user_token(user_id)
        return {
            "status": "ok",
            "token": tok,
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "token": tok,
            }
        }
    except Exception as e:
        print(f"Error Google Auth: {e}")
        raise HTTPException(status_code=400, detail=f"Error autenticando con Google: {str(e)}")

@app.get("/api/v1/conversations")
def list_conversations(request: Request, user_id: Optional[str] = None):
    resolved_uid, _ = resolve_request_user_id(request, user_id)
    uid = (resolved_uid or "").strip()
    if not uid or uid == "anon":
        return []
    try:
        return db.fetchall(
            "SELECT c.id, c.user_id, c.title, c.model, COALESCE(c.pinned, 0) as pinned, c.folder, c.created_at, c.updated_at "
            "FROM conversations c WHERE c.user_id = ? "
            "ORDER BY COALESCE(c.pinned, 0) DESC, c.updated_at DESC",
            (uid,)
        )
    except Exception:
        return db.fetchall(
            "SELECT c.id, c.user_id, c.title, c.model, c.created_at, c.updated_at "
            "FROM conversations c WHERE c.user_id = ? "
            "ORDER BY c.updated_at DESC",
            (uid,)
        )

@app.delete("/api/v1/conversations/all")
def delete_all_conversations(request: Request, user_id: Optional[str] = None):
    resolved_uid, _ = resolve_request_user_id(request, user_id)
    uid = (resolved_uid or "").strip()
    if not uid or uid == "anon":
        return {"status": "ok", "message": "Identificador de usuario no válido"}
    db.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)", (uid,))
    db.execute("DELETE FROM conversations WHERE user_id = ?", (uid,))
    return {"status": "ok", "message": "Historial limpiado"}

@app.post("/api/v1/conversations")
async def create_conversation(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    cid = str(body.get("id") or str(uuid.uuid4()))
    resolved_uid, _ = resolve_request_user_id(request, str(body.get("user_id") or "").strip())
    user_id = resolved_uid if resolved_uid else f"guest-{int(datetime.now(timezone.utc).timestamp()*1000)}"
    title = str(body.get("title") or "Nueva conversación")
    model = str(body.get("model") or "speed")
    if model == "classic":
        model = "speed"
    pinned = 1 if body.get("pinned") else 0
    folder = body.get("folder")
    now = datetime.now(timezone.utc).isoformat()
    existing = db.fetchone("SELECT id, user_id, title, pinned, folder FROM conversations WHERE id = ?", (cid,))
    if not existing:
        try:
            db.execute(
                "INSERT INTO conversations (id, user_id, title, model, pinned, folder, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (cid, user_id, title, model, pinned, folder, now, now)
            )
        except Exception:
            db.execute(
                "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (cid, user_id, title, model, now, now)
            )
    else:
        owner = (existing.get("user_id") or "").strip()
        if owner and owner not in ("anon", "") and resolved_uid and owner != resolved_uid:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta conversación.")
        final_title = title if (title and title != "Nueva conversación") else (existing.get("title") or "Nueva conversación")
        final_pinned = (1 if body.get("pinned") else 0) if "pinned" in body else existing.get("pinned", 0)
        final_folder = body.get("folder") if "folder" in body else existing.get("folder")
        try:
            db.execute(
                "UPDATE conversations SET title = ?, model = COALESCE(?, model), pinned = ?, folder = ?, updated_at = ? WHERE id = ?",
                (final_title, model, final_pinned, final_folder, now, cid)
            )
        except Exception:
            db.execute(
                "UPDATE conversations SET title = ?, model = COALESCE(?, model), updated_at = ? WHERE id = ?",
                (final_title, model, now, cid)
            )
    return {"id": cid, "user_id": user_id, "title": title, "model": model, "pinned": bool(pinned), "folder": folder, "created_at": now, "updated_at": now}

@app.post("/api/v1/conversations/{cid}")
@app.put("/api/v1/conversations/{cid}")
@app.patch("/api/v1/conversations/{cid}")
async def update_conversation(cid: str, request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    _assert_conversation_access(cid, request, body.get("user_id"))
    title = body.get("title")
    pinned = body.get("pinned")
    folder = body.get("folder")
    now = datetime.now(timezone.utc).isoformat()
    if title is not None:
        db.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (str(title), now, cid))
    if pinned is not None:
        try:
            db.execute("UPDATE conversations SET pinned = ?, updated_at = ? WHERE id = ?", (1 if pinned else 0, now, cid))
        except Exception:
            pass
    if "folder" in body:
        try:
            db.execute("UPDATE conversations SET folder = ?, updated_at = ? WHERE id = ?", (folder, now, cid))
        except Exception:
            pass
    return {"status": "ok", "id": cid, "title": title, "pinned": pinned, "folder": folder}

@app.get("/api/v1/conversations/{cid}/messages")
@app.get("/api/conversations/{cid}/messages")
def get_conversation_messages(cid: str, request: Request, user_id: Optional[str] = None):
    _assert_conversation_access(cid, request, user_id)
    try:
        rows = db.fetchall(
            "SELECT id, parent_id, role, content, image, prompt_tokens, completion_tokens, total_tokens, model_used, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (cid,)
        )
    except Exception:
        try:
            rows = db.fetchall(
                "SELECT id, role, content, image, prompt_tokens, completion_tokens, total_tokens, model_used, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (cid,)
            )
        except Exception:
            rows = db.fetchall("SELECT id, role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (cid,))
    
    # Exponer tanto parent_id como parentId
    for r in rows:
        if "parent_id" in r and "parentId" not in r:
            r["parentId"] = r["parent_id"]
    return rows

@app.get("/api/v1/conversations/{cid}")
@app.get("/api/conversations/{cid}")
def get_conversation_details(cid: str, request: Request, user_id: Optional[str] = None):
    _assert_conversation_access(cid, request, user_id)
    conv = db.fetchone("SELECT id, user_id, title, model, pinned, folder, created_at, updated_at FROM conversations WHERE id = ?", (cid,))
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    
    raw_msgs = get_conversation_messages(cid, request, user_id)
    nodes = {}
    root_id = None
    leaf_id = None

    for idx, msg in enumerate(raw_msgs):
        mid = str(msg.get("id"))
        pid = msg.get("parent_id") or msg.get("parentId")
        if pid is None and idx > 0:
            pid = str(raw_msgs[idx - 1].get("id"))
        
        if idx == 0 and not root_id:
            root_id = mid
        leaf_id = mid

        node = {
            "id": mid,
            "parentId": pid,
            "childrenIds": [],
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
            "model": msg.get("model_used") or conv.get("model", "speed"),
            "timestamp": msg.get("timestamp"),
            "image": msg.get("image"),
            "metadata": {
                "promptTokens": msg.get("prompt_tokens", 0),
                "completionTokens": msg.get("completion_tokens", 0),
                "totalTokens": msg.get("total_tokens", 0),
            }
        }
        nodes[mid] = node

    for mid, node in nodes.items():
        pid = node.get("parentId")
        if pid and pid in nodes:
            if mid not in nodes[pid]["childrenIds"]:
                nodes[pid]["childrenIds"].append(mid)

    return {
        "id": conv.get("id"),
        "userId": conv.get("user_id"),
        "title": conv.get("title"),
        "model": conv.get("model"),
        "pinned": bool(conv.get("pinned")),
        "folder": conv.get("folder"),
        "createdAt": conv.get("created_at"),
        "updatedAt": conv.get("updated_at"),
        "rootMessageId": root_id,
        "currentLeafId": leaf_id,
        "nodes": nodes,
        "messages": raw_msgs,
    }

@app.delete("/api/v1/conversations/{cid}")
def delete_conversation(cid: str, request: Request, user_id: Optional[str] = None):
    _assert_conversation_access(cid, request, user_id)
    db.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
    db.execute("DELETE FROM conversations WHERE id = ?", (cid,))
    return {"status": "deleted", "id": cid}

def _get_active_keys() -> List[str]:
    raw = os.getenv("NVIDIA_API_KEY", "") or os.getenv("NVIDIA_API_KEYS", "")
    raw_keys = [k.strip().strip('"').strip("'") for k in raw.split(",") if k.strip() and "TuClaveAqui" not in k]
    clean_keys = []
    for k in raw_keys:
        if k.lower().startswith("bearer "):
            k = k[7:].strip()
        if k and k not in clean_keys:
            clean_keys.append(k)
    return clean_keys

def _get_active_groq_key() -> Optional[str]:
    k = (os.getenv("GROQ_API_KEY") or "").strip().strip('"').strip("'")
    if k and "placeholder" not in k and "TuClave" not in k and k != "":
        return k
    return None

def _get_active_gemini_key() -> Optional[str]:
    k = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip().strip('"').strip("'")
    if k and "placeholder" not in k and "TuClave" not in k and k != "":
        return k
    return None

def _get_active_openrouter_key() -> Optional[str]:
    k = (os.getenv("OPENROUTER_API_KEY") or os.getenv("PATEWAY_API_KEY") or "").strip().strip('"').strip("'")
    if k and "placeholder" not in k and "TuClave" not in k and k != "":
        return k
    return None

def _get_openrouter_base_url() -> str:
    url = (os.getenv("OPENROUTER_BASE_URL") or os.getenv("PATEWAY_BASE_URL") or "https://api.pateway.ai/v1").strip()
    return url

# --- Clientes de IA triádicos y multi-proveedor (NVIDIA NIM + OpenRouter/Pateway + Groq + Google AI Studio) ---
client_groq = openai.AsyncOpenAI(
    api_key=(os.getenv("GROQ_API_KEY") or "gsk_placeholder"),
    base_url="https://api.groq.com/openai/v1"
)
client_nvidia = openai.AsyncOpenAI(
    api_key=(os.getenv("NVIDIA_API_KEY") or "nvapi_placeholder"),
    base_url="https://integrate.api.nvidia.com/v1"
)
client_gemini = openai.AsyncOpenAI(
    api_key=(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "gemini_placeholder"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)
client_openrouter = openai.AsyncOpenAI(
    api_key=(os.getenv("OPENROUTER_API_KEY") or os.getenv("PATEWAY_API_KEY") or "openrouter_placeholder"),
    base_url=_get_openrouter_base_url()
)

# --- Monitor de Rate Limit (429) por Proveedor para Failover Cruzado Inmediato ---
_provider_rate_limit_until: dict = {
    "nvidia": 0.0,
    "groq": 0.0,
    "gemini": 0.0,
    "openrouter": 0.0,
}

def _mark_provider_rate_limited(provider: str, cooldown_seconds: float = 60.0):
    prov = provider.lower().strip()
    until = time.time() + cooldown_seconds
    _provider_rate_limit_until[prov] = max(_provider_rate_limit_until.get(prov, 0.0), until)
    print(f"[FAILOVER CRUZADO] Proveedor '{prov}' reporto 429 (Rate Limit). Cooldown de {int(cooldown_seconds)}s activado. Saltando de inmediato a infraestructura alterna...")

def _is_provider_rate_limited(provider: str) -> bool:
    prov = provider.lower().strip()
    return time.time() < _provider_rate_limit_until.get(prov, 0.0)

def _is_rate_limit_error(err: Exception) -> bool:
    if isinstance(err, openai.RateLimitError):
        return True
    msg = str(err).lower()
    return any(p in msg for p in ("429", "rate limit", "ratelimit", "resource_exhausted", "quota", "too many requests"))

MODELS = {
    # zenith: Cerebro Superior & Multimodal (NVIDIA Nemotron Ultra / Super VL ↔ Gemini Flash ↔ Groq)
    "zenith": [
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-super-vl-120b-a12b"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
    ],
    # speed y classic: Groq (llama-3.1-8b-instant) ↔ Gemini Flash ↔ NVIDIA Nemotron Bolt
    "speed": [
        {"provider": "groq", "model": "llama-3.1-8b-instant"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
    ],
    "classic": [
        {"provider": "groq", "model": "llama-3.1-8b-instant"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
    ],
    # cortex: Gemini Flash ↔ NVIDIA Nemotron Ultra 550B ↔ Groq GPT-OSS
    "cortex": [
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "groq", "model": "openai/gpt-oss-120b"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-lightning-30b-a3b"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    ],
    # phantom: NVIDIA Nemotron Ultra ↔ Groq 70B ↔ Gemini Flash
    "phantom": [
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
    ],
    # architect: NVIDIA Nemotron Ultra ↔ Groq 70B ↔ Gemini Flash
    "architect": [
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
    ],
    # nexus: Gemini Flash ↔ NVIDIA NIM ↔ Groq
    "nexus": [
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
    ],
    # forge: NVIDIA NIM ↔ Groq ↔ Gemini Flash
    "forge": [
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
    ],
    # magister: Copiloto pedagógico SEP (Gemini Flash ↔ Groq ↔ NVIDIA NIM)
    "magister": [
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
    ],
    # root: NVIDIA Nemotron Ultra 550B ↔ Gemini Flash ↔ Groq ↔ Reasoning
    "root": [
        {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "groq", "model": "qwen/qwen3.8-27b"},
        {"provider": "nvidia", "model": "nvidia/nemotron-3.5-lightning-30b-a3b"},
    ],
}


MODEL_TEMPERATURES = {
    "zenith": 0.4,
    "speed": 0.3,
    "classic": 0.4,
    "cortex": 0.2,
    "phantom": 0.3,
    "architect": 0.3,
    "nexus": 0.5,
    "forge": 0.5,
    "root": 0.2,
    "magister": 0.4,
}

FALLBACK_MAP = {
    key: [item["model"] for item in models[1:] if isinstance(item, dict)]
    for key, models in MODELS.items()
}

GROUNDING_AND_IDENTITY_RULE = """
<grounding_and_epistemic_honesty>
1. HECHOS VERIFICADOS: LYAXIS labs™ es un laboratorio independiente de software e IA fundado y desarrollado por Oscar Naim Ambrocio Aguirre (creador y fundador de LYAXIS). Plataforma oficial: https://lyaxis-ia.vercel.app/ | Filosofía: "Create. Break. Rebuild." (crear desde el caos, aprender del error e iterar con rigor).
2. CERO ALUCINACIÓN BIOGRÁFICA/LABORAL: Prohibido inventar edad, fechas, décadas de experiencia (ej. "desde los años 2000"), empleos previos, títulos académicos o perfiles/enlaces externos (LinkedIn, X/Twitter, GitHub, etc.) ajenos a https://lyaxis-ia.vercel.app/. Ante preguntas biográficas o personales no provistas aquí, explica brevemente qué es LYAXIS labs™, reconoce a Oscar Naim Ambrocio Aguirre como su fundador y aclara con honestidad que no dispones de datos personales adicionales.
3. CONFIDENCIALIDAD DE INFRAESTRUCTURA: Terminantemente prohibido mencionar proveedores, backends o claves como "NVIDIA", "NVIDIA NIM", "Groq" o nombres de API keys. Tu identidad es exclusivamente la de los motores neuronales de LYAXIS labs™ ("Create. Break. Rebuild.").
</grounding_and_epistemic_honesty>
"""

GLOBAL_SPANISH_RULE = """
<language_rule>
Responde SIEMPRE 100% en ESPAÑOL neutro y profesional (incluyendo títulos, explicaciones y comentarios de código), salvo que el usuario pida explícitamente otro idioma.
</language_rule>
"""

_THOUGHT_RE = re.compile(r"<thought>[\s\S]*?</thought>", re.IGNORECASE)
_CODE_FENCE_RE = re.compile(r"```[\s\S]*?```")

REASONING_MODELS = {"cortex", "root"}

PLACEHOLDER_REGEX = re.compile(
    r"[\[<\{]\s*(?:"
    r"(?:pega|inserta|introduce|adjunta|coloca|ingresa|escribe|describe)\s+(?:aquí|aqui|acá|aca|tu|su|el|la|un|una)\b"
    r"|(?:tu|su)\s+(?:código|codigo|función|funcion|script|texto|consulta|problema|archivo|implementación|implementacion)\b"
    r"|(?:código|codigo|función|funcion|texto|problema)\s+(?:aquí|aqui|acá|aca|faltante)\b"
    r"|(?:aquí|aqui)\s+(?:tu|va\s+tu|va\s+el)\s+(?:código|codigo|texto|función|funcion)\b"
    r"|(?:paste\s+(?:your\s+)?code|insert\s+(?:your\s+)?code|your\s+code\s+here)"
    r")[^\]>\}]*[\]>\}]",
    re.IGNORECASE,
)

_TRAILING_COLON_CODE_REQ_RE = re.compile(
    r"(?:optimiza|corrige|depura|analiza|refactoriza|revisa|explica)\s+"
    r"(?:la\s+siguiente\s+(?:función|funcion|clase|implementación|implementacion)|el\s+siguiente\s+(?:código|codigo|script|fragmento|algoritmo)|este\s+(?:código|codigo|script|fragmento))"
    r"[^:\n]*:\s*\.?\s*$",
    re.IGNORECASE,
)

def _strip_user_directives_prefix(text: str) -> str:
    txt = (text or "").strip()
    if txt.startswith("[Directivas de Usuario:"):
        parts = txt.split("]\n", 1)
        if len(parts) > 1:
            txt = parts[1].strip()
    return txt

def detect_incomplete_query(query_text: str, has_image: bool = False) -> bool:
    """
    Capa 1 (Pre-Vuelo): Detecta plantillas sin rellenar ([Pega aquí tu código...])
    o solicitudes de optimización/depuración sin código ni imagen adjunta.
    """
    if has_image:
        return False
    text = _strip_user_directives_prefix(query_text)
    if not text:
        return False

    if PLACEHOLDER_REGEX.search(text):
        cleaned = PLACEHOLDER_REGEX.sub("", text).strip()
        # Si además del placeholder el usuario sí pegó un bloque real de código, no bloquear
        if "```" not in cleaned and not re.search(r"(?:^|\n)\s*(?:def |class |function |const |let |public |private |import |#include )", cleaned):
            return True

    if "```" not in text and "\n" not in text and _TRAILING_COLON_CODE_REQ_RE.search(text):
        return True

    return False

def get_dynamic_token_budget(model_key: str, user_query: str, has_image: bool = False) -> tuple[int, Optional[float], bool]:
    """
    Capa 4: Retorna (max_tokens, temperature_override, is_brief) calibrados según Matriz Maestra.
    Contempla margen obligatorio de reasoning (<thought>) en Cortex y Root.
    """
    if detect_incomplete_query(user_query, has_image=has_image):
        return (120, 0.0, False)

    raw_q = _strip_user_directives_prefix(user_query)
    q_lower = raw_q.lower()

    is_short = (
        0 < len(raw_q) < 90
        and "\n" not in raw_q
        and "```" not in raw_q
        and not any(
            kw in q_lower
            for kw in (
                "crea", "escribe", "implementa", "diseña", "script",
                "código", "codigo", "completo", "planeación", "planeacion",
                "guía", "tutorial", "optimiza", "analiza", "corrige", "refactoriza",
            )
        )
    )

    if is_short and not has_image:
        if model_key in REASONING_MODELS:
            # Margen crítico: ~700-900 tokens para <thought> interno + ~300 para respuesta final
            return (1000 if model_key == "cortex" else 1200, None, True)

        short_limits = {
            "speed": 180,
            "classic": 180,
            "zenith": 350,
            "phantom": 200,
            "architect": 250,
            "nexus": 200,
            "forge": 200,
            "magister": 250,
        }
        return (short_limits.get(model_key, 200), None, True)

    standard_limits = {
        "speed": 1200,
        "classic": 1200,
        "cortex": 2400,
        "zenith": 3200,
        "phantom": 1600,
        "architect": 2200,
        "nexus": 1500,
        "forge": 1800,
        "magister": 2200,
        "root": 3500,
    }
    return (standard_limits.get(model_key, 1500), None, False)

def _estimate_tokens(text: str) -> int:
    txt = (text or "").strip()
    if not txt:
        return 0
    return max(1, math.ceil(len(txt) / 3.8))

def _estimate_messages_tokens(oai_messages: List[dict]) -> int:
    total = 0
    for m in oai_messages:
        total += 4
        content = m.get("content")
        if isinstance(content, str):
            total += _estimate_tokens(content)
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        total += _estimate_tokens(part.get("text") or "")
                    elif part.get("type") == "image_url":
                        total += 765
    return total

def _extract_chunk_usage(chunk) -> Optional[dict]:
    usage_obj = getattr(chunk, "usage", None)
    if not usage_obj:
        x_groq = getattr(chunk, "x_groq", None)
        if x_groq:
            usage_obj = getattr(x_groq, "usage", None)
    if not usage_obj:
        return None
    try:
        p_tok = int(getattr(usage_obj, "prompt_tokens", 0) or 0)
        c_tok = int(getattr(usage_obj, "completion_tokens", 0) or 0)
        t_tok = int(getattr(usage_obj, "total_tokens", 0) or (p_tok + c_tok))
        if t_tok > 0 or c_tok > 0:
            return {
                "prompt_tokens": p_tok,
                "completion_tokens": c_tok,
                "total_tokens": t_tok,
            }
    except Exception:
        pass
    return None

def _insert_assistant_message(
    conversation_id: str,
    content: str,
    created_at: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    model_used: Optional[str] = None,
    parent_id: Optional[str] = None,
):
    mid = str(uuid.uuid4())
    try:
        db.execute(
            "INSERT INTO messages (id, conversation_id, parent_id, role, content, prompt_tokens, completion_tokens, total_tokens, model_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (mid, conversation_id, parent_id, "model", content, int(prompt_tokens), int(completion_tokens), int(total_tokens), model_used, created_at),
        )
    except Exception:
        try:
            db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, prompt_tokens, completion_tokens, total_tokens, model_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (mid, conversation_id, "model", content, int(prompt_tokens), int(completion_tokens), int(total_tokens), model_used, created_at),
            )
        except Exception:
            db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (mid, conversation_id, "model", content, created_at),
            )

def _condense_code_block(match: re.Match) -> str:
    block = match.group(0)
    if len(block) <= 260:
        return block
    lines = block.splitlines()
    head = "\n".join(lines[:4])
    return f"{head}\n# ... [bloque previo condensado]\n```"

def _clean_history_text(raw_text: str, max_chars: int = 0, condense_code: bool = False) -> str:
    txt = (raw_text or "").strip()
    if not txt:
        return ""
    if "[TRIAD_CORE:rebuild]" in txt:
        txt = txt.split("[TRIAD_CORE:rebuild]")[-1].split("[/TRIAD_CORE:rebuild]")[0].strip()
    txt = _THOUGHT_RE.sub("", txt).strip()
    if condense_code and "```" in txt:
        txt = _CODE_FENCE_RE.sub(_condense_code_block, txt).strip()
    if max_chars > 0 and len(txt) > max_chars:
        txt = txt[:max_chars] + "..."
    return txt

async def _stream_candidate_configs(
    candidate_configs: List[dict],
    oai_messages: List[dict],
    temperature: float,
    nvidia_keys: List[str],
    metadata: Optional[dict] = None,
    max_tokens: int = 4096,
    usage_tracker: Optional[dict] = None,
    request: Optional[Request] = None,
):
    full_text = ""
    last_err = None
    interrupted = False
    provider_usage: Optional[dict] = None
    used_model_id: Optional[str] = None

    # Filtramos y ordenamos para priorizar proveedores que NO estén en rate limit (429)
    active_candidates = list(candidate_configs)
    healthy_candidates = [c for c in active_candidates if not _is_provider_rate_limited(c.get("provider", ""))]
    rate_limited_candidates = [c for c in active_candidates if _is_provider_rate_limited(c.get("provider", ""))]
    ordered_candidates = healthy_candidates + rate_limited_candidates

    tried_candidates = set()

    for idx, target in enumerate(ordered_candidates):
        if full_text or interrupted:
            break

        provider = str(target.get("provider", "nvidia")).lower().strip()
        model_name = str(target.get("model", "")).strip()
        if not model_name:
            continue

        cand_id = f"{provider}:{model_name}"
        if cand_id in tried_candidates:
            continue
        tried_candidates.add(cand_id)

        # Si el proveedor está en cooldown activo por 429 reciente y aún hay candidatos alternos viables, saltar de inmediato
        if _is_provider_rate_limited(provider) and any(not _is_provider_rate_limited(c.get("provider", "")) for c in ordered_candidates[idx + 1:]):
            print(f"[FAILOVER CRUZADO] Omitiendo {model_name} ({provider}) por enfriamiento activo 429. Saltando a infraestructura alterna...")
            continue

        # =========================================================================
        # 1. PROVEEDOR GROQ
        # =========================================================================
        if provider == "groq":
            groq_key = _get_active_groq_key()
            if not groq_key:
                print(f"[GROQ] Sin GROQ_API_KEY activa. Saltando a proveedor alternativo ({model_name}).")
                continue

            if client_groq.api_key != groq_key:
                client_groq.api_key = groq_key

            try:
                print(f"[IA Engine - Groq] Streaming {model_name}...")
                stream = await client_groq.chat.completions.create(
                    model=model_name,
                    messages=oai_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    stream_options={"include_usage": True},
                    timeout=25.0
                )
                try:
                    async for chunk in stream:
                        if request and await request.is_disconnected():
                            interrupted = True
                            break
                        u_chunk = _extract_chunk_usage(chunk)
                        if u_chunk:
                            provider_usage = u_chunk
                        if chunk.choices and chunk.choices[0].delta.content:
                            delta = chunk.choices[0].delta.content
                            full_text += delta
                            used_model_id = cand_id
                            payload = {"token": delta}
                            if metadata:
                                payload.update(metadata)
                            yield f"data: {json.dumps(payload)}\n\n", delta
                except Exception as chunk_err:
                    print(f"Error streaming Groq ({model_name}): {chunk_err}")
                    if _is_rate_limit_error(chunk_err):
                        _mark_provider_rate_limited("groq", 60.0)
                    if not full_text:
                        last_err = chunk_err
                        continue
                    interrupted = True
                    break
                finally:
                    try:
                        await stream.close()
                    except Exception:
                        pass

                if interrupted or full_text:
                    last_err = None
                    break

            except Exception as err_groq:
                last_err = err_groq
                if _is_rate_limit_error(err_groq):
                    _mark_provider_rate_limited("groq", 60.0)
                print(f"[GROQ] Error ({model_name}): {err_groq}. Saltando de inmediato a proveedor alternativo (Gemini / NVIDIA NIM)...")
                continue

        # =========================================================================
        # 2. PROVEEDOR GOOGLE AI STUDIO (GEMINI FLASH)
        # =========================================================================
        elif provider == "gemini":
            gemini_key = _get_active_gemini_key()
            if not gemini_key:
                print(f"[GEMINI] Sin GEMINI_API_KEY activa. Saltando a proveedor alternativo ({model_name}).")
                continue

            if client_gemini.api_key != gemini_key:
                client_gemini.api_key = gemini_key

            try:
                print(f"[IA Engine - Google AI Studio / Gemini] Streaming {model_name}...")
                stream = await client_gemini.chat.completions.create(
                    model=model_name,
                    messages=oai_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    timeout=25.0
                )
                try:
                    async for chunk in stream:
                        if request and await request.is_disconnected():
                            interrupted = True
                            break
                        u_chunk = _extract_chunk_usage(chunk)
                        if u_chunk:
                            provider_usage = u_chunk
                        if chunk.choices and chunk.choices[0].delta.content:
                            delta = chunk.choices[0].delta.content
                            full_text += delta
                            used_model_id = cand_id
                            payload = {"token": delta}
                            if metadata:
                                payload.update(metadata)
                            yield f"data: {json.dumps(payload)}\n\n", delta
                except Exception as chunk_err:
                    print(f"Error streaming Gemini ({model_name}): {chunk_err}")
                    if _is_rate_limit_error(chunk_err):
                        _mark_provider_rate_limited("gemini", 60.0)
                    if not full_text:
                        last_err = chunk_err
                        continue
                    interrupted = True
                    break
                finally:
                    try:
                        await stream.close()
                    except Exception:
                        pass

                if interrupted or full_text:
                    last_err = None
                    break

            except Exception as err_gemini:
                last_err = err_gemini
                if _is_rate_limit_error(err_gemini):
                    _mark_provider_rate_limited("gemini", 60.0)
                print(f"[GEMINI] Error ({model_name}): {err_gemini}. Saltando de inmediato a proveedor alternativo (NVIDIA NIM / Groq)...")
                continue

        # =========================================================================
        # 3. PROVEEDOR NVIDIA NIM
        # =========================================================================
        elif provider == "nvidia":
            if not nvidia_keys:
                print(f"[NVIDIA] Sin claves activas de NVIDIA. Saltando a proveedor alternativo ({model_name}).")
                continue

            print(f"[IA Engine - NVIDIA NIM] Streaming {model_name}...")
            for key_idx, current_key in enumerate(nvidia_keys):
                if client_nvidia.api_key != current_key:
                    client_nvidia.api_key = current_key

                try:
                    stream = await client_nvidia.chat.completions.create(
                        model=model_name,
                        messages=oai_messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=True,
                        stream_options={"include_usage": True},
                        timeout=28.0
                    )
                    try:
                        async for chunk in stream:
                            if request and await request.is_disconnected():
                                interrupted = True
                                break
                            u_chunk = _extract_chunk_usage(chunk)
                            if u_chunk:
                                provider_usage = u_chunk
                            if chunk.choices and chunk.choices[0].delta.content:
                                delta = chunk.choices[0].delta.content
                                full_text += delta
                                used_model_id = cand_id
                                payload = {"token": delta}
                                if metadata:
                                    payload.update(metadata)
                                yield f"data: {json.dumps(payload)}\n\n", delta
                    except Exception as chunk_err:
                        print(f"Error streaming NVIDIA ({model_name}): {chunk_err}")
                        if _is_rate_limit_error(chunk_err):
                            _mark_provider_rate_limited("nvidia", 60.0)
                        if not full_text:
                            last_err = chunk_err
                            break
                        interrupted = True
                        break
                    finally:
                        try:
                            await stream.close()
                        except Exception:
                            pass

                    if interrupted or full_text:
                        break

                except Exception as err_nvidia:
                    last_err = err_nvidia
                    err_str = str(err_nvidia)
                    if "401" in err_str or "Unauthorized" in err_str or "Authentication" in err_str:
                        print(f"[NVIDIA] Clave #{key_idx+1} no autorizada (401). Probando siguiente clave...")
                        continue

                    # Si es 429 Rate Limit: NO reintentamos con más claves locales de NVIDIA;
                    # activamos cooldown de 60s en NVIDIA y saltamos inmediatamente a Groq / Gemini
                    if _is_rate_limit_error(err_nvidia):
                        _mark_provider_rate_limited("nvidia", 60.0)
                        print(f"[NVIDIA] Rate limit 429 en NVIDIA. Rompiendo reintentos locales y saltando de inmediato a proveedor alternativo (Groq / Gemini)...")
                        break

                    print(f"[NVIDIA] Error {model_name}: {err_nvidia}. Probando fallback...")
                    break

            if interrupted or full_text:
                break

        # =========================================================================
        # 4. PROVEEDOR OPENROUTER / PATEWAY
        # =========================================================================
        elif provider in ("openrouter", "pateway"):
            openrouter_key = _get_active_openrouter_key()
            if not openrouter_key:
                print(f"[OPENROUTER] Sin OPENROUTER_API_KEY activa. Saltando a proveedor alternativo ({model_name}).")
                continue

            if client_openrouter.api_key != openrouter_key:
                client_openrouter.api_key = openrouter_key
            base_url = _get_openrouter_base_url()
            if str(client_openrouter.base_url) != base_url:
                client_openrouter.base_url = base_url

            try:
                print(f"[IA Engine - OpenRouter / Pateway] Streaming {model_name}...")
                stream = await client_openrouter.chat.completions.create(
                    model=model_name,
                    messages=oai_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    timeout=25.0
                )
                try:
                    async for chunk in stream:
                        if request and await request.is_disconnected():
                            interrupted = True
                            break
                        u_chunk = _extract_chunk_usage(chunk)
                        if u_chunk:
                            provider_usage = u_chunk
                        if chunk.choices and chunk.choices[0].delta.content:
                            delta = chunk.choices[0].delta.content
                            full_text += delta
                            used_model_id = cand_id
                            payload = {"token": delta}
                            if metadata:
                                payload.update(metadata)
                            yield f"data: {json.dumps(payload)}\n\n", delta
                except Exception as chunk_err:
                    print(f"Error streaming OpenRouter ({model_name}): {chunk_err}")
                    if _is_rate_limit_error(chunk_err):
                        _mark_provider_rate_limited("openrouter", 60.0)
                    if not full_text:
                        last_err = chunk_err
                        continue
                    interrupted = True
                    break
                finally:
                    try:
                        await stream.close()
                    except Exception:
                        pass

                if interrupted or full_text:
                    last_err = None
                    break

            except Exception as err_openrouter:
                last_err = err_openrouter
                if _is_rate_limit_error(err_openrouter):
                    _mark_provider_rate_limited("openrouter", 60.0)
                print(f"[OPENROUTER] Error ({model_name}): {err_openrouter}. Saltando de inmediato a proveedor alternativo...")
                continue

    if usage_tracker is not None and full_text:
        est_p = _estimate_messages_tokens(oai_messages)
        est_c = _estimate_tokens(full_text)
        p_tok = int((provider_usage or {}).get("prompt_tokens") or est_p)
        c_tok = int((provider_usage or {}).get("completion_tokens") or est_c)
        t_tok = int((provider_usage or {}).get("total_tokens") or (p_tok + c_tok))
        usage_tracker["prompt_tokens"] = p_tok
        usage_tracker["completion_tokens"] = c_tok
        usage_tracker["total_tokens"] = t_tok
        usage_tracker["model_used"] = used_model_id

    if not full_text and last_err:
        err_msg = "⚠️ Error temporal al generar este bloque neural."
        payload = {"token": f"\n\n{err_msg}"}
        if metadata:
            payload.update(metadata)
        yield f"data: {json.dumps(payload)}\n\n", err_msg

async def generate_ai_stream(
    conversation_id: Optional[str],
    user_id: Optional[str],
    messages: List[ChatMessage],
    temperature: float,
    model_type: str = "classic",
    triad_mode: bool = False,
    request: Optional[Request] = None,
):
    nvidia_keys = _get_active_keys()

    if not nvidia_keys:
        yield f"data: {json.dumps({'token': '⚠️ Motor de IA no inicializado. Por favor verifica las variables de entorno en el servidor.'})}\n\n"
        return

    last_user_msg = next((m for m in reversed(messages) if m.role == "user"), None)
    # Capa 2: Considerar imagen activa SOLO si pertenece al turno actual del usuario (evita reenviar Base64 viejo)
    active_has_image = bool(last_user_msg and (last_user_msg.image or last_user_msg.image_url))
    raw_user_query = (last_user_msg.content or "").strip() if last_user_msg else ""
    is_incomplete_preflight = detect_incomplete_query(raw_user_query, has_image=active_has_image)

    model_key = str(model_type or "speed").lower().strip()

    # Auto-switch to zenith for multimodal vision ONLY if an image is attached in the active turn
    if active_has_image and model_key != "zenith":
        print(f"[IA Router] Imagen adjunta en turno activo ({model_key} -> zenith). Enrutando automáticamente a Zenith para análisis multimodal.")
        model_key = "zenith"
    elif model_key not in MODELS:
        model_key = "speed"

    # Capa 1 + Matriz Maestra: Desactivar TRIAD en plantillas incompletas o preguntas breves puntuales
    if triad_mode and not active_has_image:
        _, _, is_brief_for_triad = get_dynamic_token_budget(model_key, raw_user_query, has_image=False)
        if is_incomplete_preflight or is_brief_for_triad:
            print("[LYAXIS TRIAD -> Pre-Vuelo] Consulta breve o plantilla incompleta detectada; redirigiendo a modo directo económico.")
            triad_mode = False

    prompt_map = {
        "zenith": ZENITH_SYSTEM_PROMPT,
        "cortex": CORTEX_SYSTEM_PROMPT,
        "speed": SPEED_SYSTEM_PROMPT,
        "root": ROOT_SYSTEM_PROMPT,
        "nexus": NEXUS_SYSTEM_PROMPT,
        "forge": FORGE_SYSTEM_PROMPT,
        "phantom": PHANTOM_SYSTEM_PROMPT,
        "architect": ARCHITECT_SYSTEM_PROMPT,
        "classic": CLASSIC_SYSTEM_PROMPT,
        "magister": MAGISTER_SYSTEM_PROMPT,
    }
    # Prefijo estático idéntico al inicio para maximizar Prompt/KV Caching entre modelos
    active_prompt = (
        GROUNDING_AND_IDENTITY_RULE.strip()
        + "\n\n"
        + GLOBAL_SPANISH_RULE.strip()
        + "\n\n"
        + (prompt_map.get(model_key, SPEED_SYSTEM_PROMPT)).strip()
    )
    
    # 1. Persist user message to DB
    if conversation_id and last_user_msg:
        try:
            now = datetime.now(timezone.utc).isoformat()
            title_text = (last_user_msg.content or "Consulta con imagen")[:30]
            conv = db.fetchone("SELECT id, title FROM conversations WHERE id = ?", (conversation_id,))
            if not conv:
                db.execute(
                    "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (conversation_id, user_id, title_text, model_key, now, now)
                )
            else:
                new_title = title_text if conv.get("title") in ("Nueva conversación", None, "") else conv.get("title")
                db.execute(
                    "UPDATE conversations SET user_id = COALESCE(user_id, ?), title = ?, updated_at = ? WHERE id = ?",
                    (user_id, new_title, now, conversation_id)
                )
            mid = last_user_msg.id or str(uuid.uuid4())
            existing_msg = db.fetchone("SELECT id FROM messages WHERE id = ?", (mid,))
            if not existing_msg:
                img_to_store = last_user_msg.image or last_user_msg.image_url
                user_est_tokens = _estimate_tokens(last_user_msg.content or "") + (765 if img_to_store else 0)
                user_parent_id = last_user_msg.get_parent_id() if hasattr(last_user_msg, "get_parent_id") else (last_user_msg.parent_id or getattr(last_user_msg, "parentId", None))
                if user_parent_id is None and len(messages) > 1:
                    prior_msg = messages[-2]
                    user_parent_id = getattr(prior_msg, "id", None)
                try:
                    db.execute(
                        "INSERT INTO messages (id, conversation_id, parent_id, role, content, image, prompt_tokens, total_tokens, model_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (mid, conversation_id, user_parent_id, "user", last_user_msg.content or "", img_to_store, user_est_tokens, user_est_tokens, model_key, now)
                    )
                except Exception:
                    try:
                        db.execute(
                            "INSERT INTO messages (id, conversation_id, role, content, image, prompt_tokens, total_tokens, model_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            (mid, conversation_id, "user", last_user_msg.content or "", img_to_store, user_est_tokens, user_est_tokens, model_key, now)
                        )
                    except Exception:
                        try:
                            db.execute(
                                "INSERT INTO messages (id, conversation_id, role, content, image, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                                (mid, conversation_id, "user", last_user_msg.content or "", img_to_store, now)
                            )
                        except Exception:
                            db.execute(
                                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                                (mid, conversation_id, "user", last_user_msg.content or "", now)
                            )
            db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        except Exception as err_db:
            print(f"Aviso DB mensaje: {err_db}")

    # --- ORQUESTACION LYAXIS TRIAD CONCURRENTE (CREATE || BREAK || REBUILD A LA PAR) ---
    if triad_mode:
        print("[LYAXIS TRIAD] Activando orquestacion simultanea a la par (Speed || Phantom || Cortex Pro)...")
        user_query_text = raw_user_query if raw_user_query else "Consulta técnica"

        # Contexto conversacional previo ultra-conciso (máximo 2 turnos previos sintetizados para ahorrar tokens)
        prior_context_text = ""
        prior_turns = [m for m in messages if m != last_user_msg][-3:]
        if prior_turns:
            context_snippets = []
            for pm in prior_turns:
                c = _clean_history_text(pm.content or "", max_chars=200, condense_code=True)
                if not c:
                    continue
                role_label = "Usuario" if pm.role == "user" else "Asistente"
                context_snippets.append(f"{role_label}: {c}")
            if context_snippets:
                prior_context_text = "CONTEXTO PREVIO CONCISO:\n" + "\n".join(context_snippets) + "\n\n"

        # NÚCLEO I · CREATE (Speed - #2563FF) -> Groq (llama-3.1-8b-instant) / Gemini Flash / NVIDIA Bolt
        candidate_create = [
            {"provider": "groq", "model": "llama-3.1-8b-instant"},
            {"provider": "gemini", "model": "gemini-2.5-flash"},
            {"provider": "openrouter", "model": "deepseek-v4-flash"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
            {"provider": "openrouter", "model": "qwen3.6-plus"},
            {"provider": "groq", "model": "qwen/qwen3.8-27b"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
        ]
        meta_create = {"core": "create", "core_name": "Speed", "color": "#2563FF"}
        create_prompt = (
            "Eres NÚCLEO I · CREATE (Speed) del sistema insignia LYAXIS TRIAD™. "
            "Propón la solución técnica inmediata, código limpio y directo a la consulta del usuario de forma ágil y concisa (máximo 140 palabras). "
            "Redacta 100% en español con formato Markdown y código funcional."
        )
        create_messages = [
            {"role": "system", "content": create_prompt},
            {"role": "user", "content": f"{prior_context_text}CONSULTA DEL USUARIO:\n{user_query_text}".strip()}
        ]

        # NÚCLEO II · BREAK (Phantom - #EF4444) -> NVIDIA Nemotron Ultra / Groq / OpenRouter
        candidate_break = [
            {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
            {"provider": "groq", "model": "llama-3.3-70b-versatile"},
            {"provider": "openrouter", "model": "deepseek-v4-pro"},
            {"provider": "gemini", "model": "gemini-2.5-flash"},
            {"provider": "openrouter", "model": "claude-haiku-4-5-20251001"},
            {"provider": "groq", "model": "qwen/qwen3.8-27b"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
        ]
        meta_break = {"core": "break", "core_name": "Phantom", "color": "#EF4444"}
        break_prompt = (
            "Eres NÚCLEO II · BREAK (Phantom) del sistema insignia LYAXIS TRIAD™. "
            "Actúa como auditor implacable y Red Team. Analiza la consulta del usuario identificando los puntos críticos de falla, vectores de vulnerabilidad de seguridad, cuellos de botella y casos de borde que romperían cualquier implementación descuidada (máximo 120 palabras en viñetas claras). "
            "Redacta 100% en español."
        )
        break_messages = [
            {"role": "system", "content": break_prompt},
            {"role": "user", "content": f"{prior_context_text}CONSULTA TÉCNICA DEL USUARIO:\n{user_query_text}\n\nAudita de forma implacable señalando vulnerabilidades, riesgos y fallas potenciales en viñetas claras.".strip()}
        ]

        # NÚCLEO III · REBUILD (Cortex Pro - #7C3AED) -> OpenRouter / Gemini Flash / NVIDIA Nemotron Ultra / Groq
        candidate_rebuild = [
            {"provider": "openrouter", "model": "deepseek-v4-pro"},
            {"provider": "gemini", "model": "gemini-2.5-flash"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b"},
            {"provider": "groq", "model": "openai/gpt-oss-120b"},
            {"provider": "openrouter", "model": "qwen3.7-max"},
            {"provider": "gemini", "model": "gemini-2.0-flash"},
            {"provider": "groq", "model": "llama-3.3-70b-versatile"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3.5-lightning-30b-a3b"},
        ]
        meta_rebuild = {"core": "rebuild", "core_name": "Cortex Pro", "color": "#7C3AED"}
        rebuild_prompt = (
            "Eres NÚCLEO III · REBUILD (Cortex Pro) de LYAXIS TRIAD™. "
            "Recibes la propuesta ágil de CREATE y la auditoría de riesgos de BREAK. "
            "En un bloque breve <thought>...</thought> sintetiza cómo corregir los riesgos detectados, "
            "y entrega la solución definitiva, blindada, modular y lista para producción 100% en español."
        )

        # Fase 1 Concurrente: transmitir CREATE y BREAK en paralelo; Fase 2 Conectada: sintetizar en REBUILD con contexto real
        # Presupuesto Matriz Maestra TRIAD: Create (800) | Break (800) | Rebuild (1,600) -> Total Máx: 3,200 tokens
        triad_queue = asyncio.Queue()
        triad_usages = {"create": {}, "break": {}, "rebuild": {}}

        async def _core_worker(core_id: str, cfgs: list, msgs: list, temp: float, meta: dict, core_max_tokens: int):
            accumulated = ""
            try:
                async for sse_line, delta in _stream_candidate_configs(
                    cfgs, msgs, temp, nvidia_keys, metadata=meta, max_tokens=core_max_tokens, usage_tracker=triad_usages[core_id], request=request
                ):
                    accumulated += delta
                    await triad_queue.put((sse_line, delta, core_id))
            except Exception as core_err:
                print(f"[LYAXIS TRIAD] Error en núcleo {core_id}: {core_err}")
            finally:
                await triad_queue.put((None, accumulated, core_id))

        phase1_tasks = [
            asyncio.create_task(_core_worker("create", candidate_create, create_messages, 0.5, meta_create, 800)),
            asyncio.create_task(_core_worker("break", candidate_break, break_messages, 0.3, meta_break, 800)),
        ]

        active_workers = len(phase1_tasks)
        speed_text = ""
        phantom_text = ""
        cortex_text = ""
        client_disconnected = False

        while active_workers > 0:
            sse_line, delta, core_id = await triad_queue.get()
            if request and await request.is_disconnected():
                print("[LYAXIS TRIAD] Cliente desconectado. Cancelando tareas activas de núcleos.")
                client_disconnected = True
                for t in phase1_tasks:
                    t.cancel()
                break
            if sse_line is None:
                active_workers -= 1
                if core_id == "create":
                    speed_text = delta
                elif core_id == "break":
                    phantom_text = delta
            else:
                yield sse_line

        await asyncio.gather(*phase1_tasks, return_exceptions=True)

        if client_disconnected:
            triad_p_tok = sum(int(u.get("prompt_tokens") or 0) for u in triad_usages.values())
            triad_c_tok = sum(int(u.get("completion_tokens") or 0) for u in triad_usages.values())
            triad_t_tok = sum(int(u.get("total_tokens") or 0) for u in triad_usages.values())
            triad_models_used = "+".join(filter(None, [triad_usages[k].get("model_used") for k in ("create", "break", "rebuild")])) or "triad"
            if conversation_id and (speed_text or phantom_text):
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    triad_parts = []
                    if speed_text:
                        triad_parts.append(f"[TRIAD_CORE:create]\n{speed_text.strip()}\n[/TRIAD_CORE:create]")
                    if phantom_text:
                        triad_parts.append(f"[TRIAD_CORE:break]\n{phantom_text.strip()}\n[/TRIAD_CORE:break]")
                    triad_combined = "\n\n".join(triad_parts)
                    _insert_assistant_message(
                        conversation_id=conversation_id,
                        content=triad_combined,
                        created_at=now,
                        prompt_tokens=triad_p_tok,
                        completion_tokens=triad_c_tok,
                        total_tokens=triad_t_tok,
                        model_used=triad_models_used,
                        parent_id=mid,
                    )
                    db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
                except Exception as err_db_triad:
                    print(f"Aviso guardando respuesta Triad parcial en DB: {err_db_triad}")
            return

        # Fase 2: REBUILD recibe los hallazgos condensados de CREATE y BREAK para una reconstrucción auténtica
        create_brief = (speed_text or "").strip()[:380]
        break_brief = (phantom_text or "").strip()[:380]
        rebuild_user_content = (
            f"{prior_context_text}CONSULTA ORIGINAL DEL USUARIO:\n{user_query_text}\n\n"
            f"BORRADOR INICIAL (CREATE):\n{create_brief}\n\n"
            f"RIESGOS DETECTADOS (BREAK):\n{break_brief}\n\n"
            "Entrega ahora la arquitectura/código definitivo blindado resolviendo los puntos de falla."
        ).strip()
        rebuild_messages = [
            {"role": "system", "content": rebuild_prompt},
            {"role": "user", "content": rebuild_user_content}
        ]

        async for sse_line, delta in _stream_candidate_configs(
            candidate_rebuild, rebuild_messages, 0.2, nvidia_keys, metadata=meta_rebuild, max_tokens=1600, usage_tracker=triad_usages["rebuild"], request=request
        ):
            if request and await request.is_disconnected():
                print("[LYAXIS TRIAD Rebuild] Cliente desconectado. Abortando rebuild.")
                client_disconnected = True
                break
            cortex_text += delta
            yield sse_line

        if request and await request.is_disconnected():
            client_disconnected = True

        triad_p_tok = sum(int(u.get("prompt_tokens") or 0) for u in triad_usages.values())
        triad_c_tok = sum(int(u.get("completion_tokens") or 0) for u in triad_usages.values())
        triad_t_tok = sum(int(u.get("total_tokens") or 0) for u in triad_usages.values())
        triad_models_used = "+".join(filter(None, [triad_usages[k].get("model_used") for k in ("create", "break", "rebuild")])) or "triad"

        if not client_disconnected:
            # Señal de finalización triádica con telemetría agregada
            yield f"data: {json.dumps({'done': True, 'usage': {'prompt_tokens': triad_p_tok, 'completion_tokens': triad_c_tok, 'total_tokens': triad_t_tok, 'model_used': triad_models_used}})}\n\n"

        # Guardar en base de datos el mensaje combinado estructurado + telemetría
        if conversation_id and (speed_text or phantom_text or cortex_text):
            try:
                now = datetime.now(timezone.utc).isoformat()
                triad_combined = (
                    f"[TRIAD_CORE:create]\n{speed_text.strip()}\n[/TRIAD_CORE:create]\n\n"
                    f"[TRIAD_CORE:break]\n{phantom_text.strip()}\n[/TRIAD_CORE:break]\n\n"
                    f"[TRIAD_CORE:rebuild]\n{cortex_text.strip()}\n[/TRIAD_CORE:rebuild]"
                )
                _insert_assistant_message(
                    conversation_id=conversation_id,
                    content=triad_combined,
                    created_at=now,
                    prompt_tokens=triad_p_tok,
                    completion_tokens=triad_c_tok,
                    total_tokens=triad_t_tok,
                    model_used=triad_models_used,
                    parent_id=mid,
                )
                db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
            except Exception as err_db_triad:
                print(f"Aviso guardando respuesta Triad en DB: {err_db_triad}")

        return

    # --- 1.5 Caché Exacto para Consultas Iniciales / Quick Actions (0 tokens consumidos) ---
    is_cacheable_single_turn = (
        not triad_mode
        and not active_has_image
        and not is_incomplete_preflight
        and len(messages) == 1
        and last_user_msg is not None
        and temperature <= 0.5
    )
    single_turn_query = raw_user_query
    if is_cacheable_single_turn and single_turn_query:
        cached_answer = _get_prompt_cache(model_key, single_turn_query)
        if cached_answer:
            print(f"[PROMPT CACHE HIT] Sirviendo respuesta instantánea para '{model_key}' (0 tokens de API).")
            yield f"data: {json.dumps({'token': cached_answer})}\n\n"
            yield f"data: {json.dumps({'done': True, 'usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0, 'model_used': f'cache:{model_key}'}})}\n\n"
            if conversation_id:
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    _insert_assistant_message(
                        conversation_id=conversation_id,
                        content=cached_answer,
                        created_at=now,
                        prompt_tokens=0,
                        completion_tokens=0,
                        total_tokens=0,
                        model_used=f"cache:{model_key}",
                        parent_id=mid,
                    )
                    db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
                except Exception as err_cache_db:
                    print(f"Aviso guardando respuesta cacheada en DB: {err_cache_db}")
            return

    full_response_text = ""
    last_err = None

    # --- 2. Enrutamiento y Fallback Inteligente (Groq + NVIDIA NIM + Gemini) ---
    target_entries = MODELS.get(model_key, MODELS.get("speed", []))
    if isinstance(target_entries, dict):
        candidate_configs = [target_entries]
    elif isinstance(target_entries, list):
        candidate_configs = list(target_entries)
    else:
        candidate_configs = [
            {"provider": "groq", "model": "qwen/qwen3.8-27b"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"}
        ]

    # Si hay una imagen en el turno activo, asegurar que el modelo de visión multimodal tenga prioridad
    if active_has_image:
        vision_cfg = {"provider": "nvidia", "model": "nvidia/nemotron-3.5-super-vl-120b-a12b"}
        if vision_cfg not in candidate_configs:
            candidate_configs.insert(0, vision_cfg)

    # Capa 2: Sliding window diferenciada por motor (4 mensajes para motores ágiles, 6 para analíticos)
    MAX_TURNS = 4 if model_key in ("speed", "classic", "nexus") else 6
    recent_messages = messages[-MAX_TURNS:] if len(messages) > MAX_TURNS else messages

    # Enviar Base64 de imagen ÚNICAMENTE si está en el último mensaje (turno activo)
    active_img_msg_idx = len(recent_messages) - 1 if (recent_messages and (recent_messages[-1].image or recent_messages[-1].image_url)) else -1

    # Format messages for OpenAI standard API (with multimodal image support)
    oai_messages = [{"role": "system", "content": active_prompt}]
    for idx, msg in enumerate(recent_messages):
        msg_img = msg.image or msg.image_url
        content_str = (msg.content or "").strip()
        if not content_str and not msg_img:
            continue
        if content_str.startswith('⚠️') or content_str.startswith('❌'):
            continue
        role = "assistant" if str(msg.role).lower() in ("model", "assistant") else "user"
        if role == "assistant":
            # Mantener contexto reciente y condensar bloques de código antiguos en turnos previos
            is_older_turn = idx < len(recent_messages) - 2
            cap = 1800 if not is_older_turn else 900
            content_str = _clean_history_text(content_str, max_chars=cap, condense_code=is_older_turn)
            if not content_str:
                continue

        if role == "user" and msg_img:
            if idx == active_img_msg_idx:
                user_content = []
                if content_str:
                    user_content.append({"type": "text", "text": content_str})
                else:
                    user_content.append({"type": "text", "text": "Describe y analiza esta imagen en detalle."})
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": msg_img}
                })
                oai_messages.append({"role": "user", "content": user_content})
            else:
                annotated = f"{content_str} [Imagen analizada en turno anterior]".strip()
                oai_messages.append({"role": "user", "content": annotated})
        else:
            oai_messages.append({"role": role, "content": content_str})

    if len(oai_messages) == 1 and last_user_msg:
        last_img = last_user_msg.image or last_user_msg.image_url
        last_text = (last_user_msg.content or "").strip()
        if last_img:
            oai_messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": last_text if last_text else "Describe y analiza esta imagen en detalle."},
                    {"type": "image_url", "image_url": {"url": last_img}}
                ]
            })
        elif last_text:
            oai_messages.append({"role": "user", "content": last_text})

    # --- Capas 1 y 4: Filtro Pre-Vuelo + Presupuesto Dinámico de Salida ---
    model_max_tokens, temp_override, is_brief = get_dynamic_token_budget(
        model_key=model_key,
        user_query=raw_user_query,
        has_image=active_has_image,
    )
    if temp_override is not None:
        temperature = temp_override

    if is_incomplete_preflight:
        # En pre-vuelo con plantilla incompleta: priorizar motores instantáneos sin reasoning oculto para garantizar <60 tokens
        fast_clarify_candidates = [
            {"provider": "groq", "model": "llama-3.1-8b-instant"},
            {"provider": "nvidia", "model": "nvidia/nemotron-3.5-bolt-e4b"},
            {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        ]
        candidate_configs = fast_clarify_candidates + [c for c in candidate_configs if c not in fast_clarify_candidates]
        oai_messages[0]["content"] = (
            GROUNDING_AND_IDENTITY_RULE.strip()
            + "\n\n"
            + GLOBAL_SPANISH_RULE.strip()
            + "\n\n"
            + "INSTRUCCIÓN PRIORITARIA DE PRE-VUELO: El usuario dejó un marcador de posición sin rellenar (ej. [Pega aquí...]) "
            "o solicitó optimizar/depurar/analizar sin incluir el código ni los datos necesarios. "
            "PROHIBIDO inventar ejemplos, casos hipotéticos, bloques de código o tutoriales. "
            "PROHIBIDO usar bloques <thought>, saludos o disculpas. "
            "Responde ÚNICAMENTE en 1 o 2 oraciones directas solicitando el código o información específica que falta."
        )
    elif is_brief:
        if model_key == "cortex":
            oai_messages[0]["content"] += (
                "\nMantén tu razonamiento interno <thought> breve y puntual (máximo 80 palabras), "
                "ciérralo con </thought> y entrega una respuesta final directa y concisa (máximo 140 palabras)."
            )
        else:
            oai_messages[0]["content"] += "\nResponde de forma directa y concisa (máximo 140 palabras) salvo que la precisión técnica exija más."

    usage_tracker: dict = {}
    client_disconnected = False

    # Generación con failover cruzado inteligente entre todos los proveedores (NVIDIA NIM ↔ Groq ↔ Gemini ↔ OpenRouter)
    async for sse_line, delta in _stream_candidate_configs(
        candidate_configs=candidate_configs,
        oai_messages=oai_messages,
        temperature=temperature,
        nvidia_keys=nvidia_keys,
        max_tokens=model_max_tokens,
        usage_tracker=usage_tracker,
        request=request,
    ):
        if request and await request.is_disconnected():
            print("[SSE Stream] Cliente desconectado. Abortando inferencia backend.")
            client_disconnected = True
            break
        full_response_text += delta
        yield sse_line

    if request and await request.is_disconnected():
        client_disconnected = True

    # Handle final errors if generation yielded nothing
    if not full_response_text and last_err and not client_disconnected:
        err_msg = str(last_err)
        if "401" in err_msg or "Unauthorized" in err_msg or "Authentication" in err_msg:
            friendly_err = "⚠️ Error de autenticación en el motor neural. Por favor verifica las credenciales de acceso en el servidor."
        elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "QUOTA" in err_msg or "RateLimit" in err_msg:
            friendly_err = "⚠️ Alta demanda temporal en los servidores de LYAXIS. Por favor espera unos segundos e inténtalo de nuevo."
        elif "timeout" in err_msg.lower() or "timed out" in err_msg.lower():
            friendly_err = "⚠️ Tiempo de espera agotado. Por favor intenta formular tu consulta nuevamente."
        else:
            friendly_err = "⚠️ El motor de LYAXIS IA no pudo completar la respuesta. Por favor intenta de nuevo en unos momentos."
        yield f"data: {json.dumps({'token': friendly_err})}\n\n"
        return

    if full_response_text and not client_disconnected:
        yield f"data: {json.dumps({'done': True, 'usage': usage_tracker})}\n\n"

    # Almacenar en caché si fue consulta limpia de un solo turno y se completó íntegramente
    if is_cacheable_single_turn and single_turn_query and full_response_text and not client_disconnected:
        _set_prompt_cache(model_key, single_turn_query, full_response_text)

    # Capa 5: Guardar respuesta del asistente y telemetría real de tokens en DB
    if conversation_id and full_response_text:
        try:
            now = datetime.now(timezone.utc).isoformat()
            _insert_assistant_message(
                conversation_id=conversation_id,
                content=full_response_text,
                created_at=now,
                prompt_tokens=int(usage_tracker.get("prompt_tokens") or 0),
                completion_tokens=int(usage_tracker.get("completion_tokens") or 0),
                total_tokens=int(usage_tracker.get("total_tokens") or 0),
                model_used=usage_tracker.get("model_used") or model_key,
                parent_id=mid,
            )
            db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        except Exception as err_db2:
            print(f"Aviso guardando respuesta en DB: {err_db2}")

@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_general_rate_limit(client_ip, max_requests=40, window_seconds=60)
    try:
        body = await request.json()
    except Exception as e:
        print(f"Error parseando JSON body stream: {e}")
        body = {}

    if not isinstance(body, dict):
        body = {}

    conversation_id = body.get("conversation_id")
    resolved_uid, _ = resolve_request_user_id(request, body.get("user_id"))
    user_id = resolved_uid or body.get("user_id")
    model_type = str(body.get("model") or "speed").lower().strip()
    if model_type == "classic":
        model_type = "speed"

    model_default_temp = MODEL_TEMPERATURES.get(model_type, 0.3)
    req_temp = body.get("temperature")
    if req_temp is None:
        temp = model_default_temp
    else:
        try:
            temp = float(req_temp)
            # Permitir temp = 0.0 determinista y acotar el techo (0.0 - 0.5) en motores técnicos
            if model_type in ("speed", "classic", "cortex", "magister", "phantom", "architect", "root"):
                if temp > 0.5 or temp < 0.0:
                    temp = model_default_temp
        except Exception:
            temp = model_default_temp

    raw_messages = body.get("messages") or body.get("conversationHistory") or []
    messages: List[ChatMessage] = []

    if isinstance(raw_messages, list):
        for m in raw_messages:
            if isinstance(m, dict):
                content = str(m.get("content") or "").strip()
                img = m.get("image") or m.get("image_url")
                if (content or img) and not content.startswith("⚠️") and not content.startswith("❌"):
                    role = "model" if str(m.get("role")).lower() in ("model", "assistant") else "user"
                    messages.append(ChatMessage(
                        id=str(m.get("id")) if m.get("id") else None,
                        role=role,
                        content=content,
                        image=str(img) if img else None
                    ))

    if not messages:
        messages = [ChatMessage(role="user", content="Hola")]

    triad_mode = bool(body.get("triad_mode", False))

    # No consumir cuota TRIAD si la consulta es una plantilla vacía o pregunta trivial puntual
    if triad_mode:
        last_u = next((m for m in reversed(messages) if m.role == "user"), None)
        last_u_img = bool(last_u and (last_u.image or last_u.image_url))
        last_u_txt = (last_u.content or "").strip() if last_u else ""
        _, _, is_brief_q = get_dynamic_token_budget(model_type, last_u_txt, has_image=last_u_img)
        if detect_incomplete_query(last_u_txt, has_image=last_u_img) or (is_brief_q and not last_u_img):
            triad_mode = False

    # Recortar el historial enviado: 4 mensajes para TRIAD / motores rápidos, 6 para analíticos
    max_history = 4 if (triad_mode or model_type in ("speed", "classic", "nexus")) else 6
    if len(messages) > max_history:
        messages = messages[-max_history:]

    # Asegurar que la conversación exista en conversations antes de guardar mensajes o generar stream
    if conversation_id:
        try:
            now_ts = datetime.now(timezone.utc).isoformat()
            existing_c = db.fetchone("SELECT id, title FROM conversations WHERE id = ?", (conversation_id,))
            first_title = "Nueva conversación"
            if messages:
                u_first = next((m for m in messages if m.role == "user"), None)
                if u_first and u_first.content:
                    # Limpiar prefijos de directivas o archivos adjuntos para el título
                    clean_txt = u_first.content
                    if clean_txt.startswith("[Directivas de Usuario:"):
                        parts = clean_txt.split("]\n", 1)
                        clean_txt = parts[1] if len(parts) > 1 else clean_txt
                    if clean_txt.startswith("[Archivo"):
                        lines = [l for l in clean_txt.splitlines() if not l.startswith("[Archivo") and not l.startswith("```")]
                        clean_txt = " ".join(lines).strip() or "Análisis de archivo"
                    clean_txt = " ".join(clean_txt.strip().split())
                    if clean_txt:
                        first_title = clean_txt[:46] + ("…" if len(clean_txt) > 46 else "")
            if not existing_c:
                db_uid = (user_id or "").strip()
                if not db_uid or db_uid == "anon":
                    db_uid = f"guest-{int(datetime.now(timezone.utc).timestamp()*1000)}"
                db.execute(
                    "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (conversation_id, db_uid, first_title, model_type, now_ts, now_ts)
                )
            elif existing_c.get("title") in (None, "", "Nueva conversación") and first_title != "Nueva conversación":
                db.execute(
                    "UPDATE conversations SET title = ?, model = ?, updated_at = ? WHERE id = ?",
                    (first_title, model_type, now_ts, conversation_id)
                )
        except Exception as e_conv:
            print(f"Aviso asegurando conversación en chat_stream_endpoint: {e_conv}")

    # --- PROTECCIÓN DE CUOTA SLIDING WINDOW Y ENFRIAMIENTO (COOLDOWN): LYAXIS TRIAD™ ---
    # Enfriamiento obligatorio de 2 minutos (120s) entre consultas TRIAD + máximo 3 consultas cada 6 horas.
    # Las consultas individuales estándar permanecen ilimitadas.
    if triad_mode:
        client_id = get_client_identifier(request, user_id)
        allowed, remaining, retry_after_ms, reason = await check_and_consume_triad_quota(client_id)
        if not allowed:
            retry_after_sec = max(1, math.ceil(retry_after_ms / 1000))
            if reason == "COOLDOWN":
                msg = f"⏳ Enfriamiento de LYAXIS TRIAD™ activo (1 uso cada 2 minutos). Disponible de nuevo en {retry_after_sec} segundos."
                err_code = "TRIAD_COOLDOWN_ACTIVE"
            else:
                hours = retry_after_sec // 3600
                minutes = (retry_after_sec % 3600) // 60
                readable_time = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                msg = f"⚠️ Cuota de LYAXIS TRIAD™ agotada (máximo 3 consultas cada 6 horas). Próxima recarga en {readable_time}."
                err_code = "TRIAD_QUOTA_EXCEEDED"

            return JSONResponse(
                status_code=429,
                content={
                    "error": err_code,
                    "reason": reason,
                    "message": msg,
                    "retryAfterMs": retry_after_ms,
                    "remaining": remaining,
                    "cooldownMs": int(TRIAD_COOLDOWN_SECONDS * 1000),
                    "windowMs": int(TRIAD_WINDOW_SECONDS * 1000),
                },
                headers={
                    "Retry-After": str(retry_after_sec),
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                },
            )

    generator = generate_ai_stream(
        conversation_id=conversation_id,
        user_id=user_id,
        messages=messages,
        temperature=temp,
        model_type=model_type,
        triad_mode=triad_mode,
        request=request,
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# Alias de compatibilidad solicitados para endpoints de chat
@app.post("/api/chat")
@app.post("/api/triad")
async def chat_alias_endpoint(request: Request):
    return await chat_stream_endpoint(request)

@app.post("/api/v1/chat/clarify")
async def chat_clarify_endpoint():
    """Stub de compatibilidad retroactiva sin consumo de tokens (flujo unificado en /api/v1/chat/stream)."""
    return JSONResponse(status_code=200, content={"type": "SKIP", "reason": "Unified streaming pipeline active."})


@app.get("/api/v1/telemetry")
def get_system_telemetry(request: Request, user_id: Optional[str] = None):
    """Retorna telemetría en tiempo real de los núcleos neuronales, base de datos y cuota TRIAD™."""
    now = time.time()
    providers_status = {}
    for prov in ("groq", "gemini", "nvidia", "openrouter"):
        cooldown_left = max(0.0, _provider_rate_limit_until.get(prov, 0.0) - now)
        providers_status[prov] = {
            "online": cooldown_left == 0.0,
            "cooldownSeconds": round(cooldown_left, 1)
        }

    resolved_uid, _ = resolve_request_user_id(request, user_id)
    uid = (resolved_uid or user_id or "").strip()
    conv_count = 0
    msg_count = 0
    prompt_tokens_sum = 0
    completion_tokens_sum = 0
    total_tokens_sum = 0
    model_distribution = {}
    if uid and uid != "anon":
        try:
            convs = db.fetchall("SELECT id, model FROM conversations WHERE user_id = ?", (uid,))
            conv_count = len(convs) if convs else 0
            for c in (convs or []):
                m = c.get("model") or "speed"
                model_distribution[m] = model_distribution.get(m, 0) + 1
            msgs = db.fetchone(
                "SELECT COUNT(*) as cnt, COALESCE(SUM(prompt_tokens), 0) as p_tok, COALESCE(SUM(completion_tokens), 0) as c_tok, COALESCE(SUM(total_tokens), 0) as t_tok FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)",
                (uid,)
            )
            if msgs:
                msg_count = int(msgs.get("cnt") or 0)
                prompt_tokens_sum = int(msgs.get("p_tok") or 0)
                completion_tokens_sum = int(msgs.get("c_tok") or 0)
                total_tokens_sum = int(msgs.get("t_tok") or 0)
        except Exception:
            pass

    client_id = get_client_identifier(request, user_id)
    cutoff = now - TRIAD_WINDOW_SECONDS
    triad_used = 0
    try:
        rows = db.fetchall(
            "SELECT timestamp FROM triad_rate_limits WHERE client_id = ? AND timestamp > ?",
            (client_id, cutoff)
        )
        triad_used = len(rows) if rows else 0
    except Exception:
        pass

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "PostgreSQL (Supabase Pool)" if db.use_postgres else "SQLite WAL Engine",
        "providers": providers_status,
        "userStats": {
            "conversations": conv_count,
            "messages": msg_count,
            "promptTokens": prompt_tokens_sum,
            "completionTokens": completion_tokens_sum,
            "totalTokens": total_tokens_sum,
            "modelDistribution": model_distribution,
            "triadRemaining": max(0, TRIAD_MAX_REQUESTS - triad_used),
            "triadMax": TRIAD_MAX_REQUESTS,
        },
    }


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    db_mode = "postgres" if db.use_postgres else ("degraded_ephemeral_sqlite" if getattr(db, "is_degraded", False) else "sqlite")
    return {
        "status": "warning" if getattr(db, "is_degraded", False) else "ok",
        "service": "LYAXIS IA Production API",
        "database": db_mode,
        "database_warning": "Supabase en pausa o desconectado; operando con SQLite efímero local" if getattr(db, "is_degraded", False) else None
    }
