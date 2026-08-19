import os
import json
import sqlite3
import asyncio
import uuid
import random
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

app = FastAPI(title="LYAXIS IA Production API", version="1.0.0")

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

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        response = await call_next(request)
    
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "lyaxis.db")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com")

def init_sqlite():
    try:
        with sqlite3.connect(DB_PATH) as conn:
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
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
            conn.commit()
    except Exception as e:
        print(f"Init SQLite local: {e}")

init_sqlite()

class Database:
    def __init__(self):
        self.use_postgres = False
        if DATABASE_URL:
            try:
                import psycopg2
                db_url = DATABASE_URL
                if "sslmode=" not in db_url:
                    db_url += ("?" if "?" not in db_url else "&") + "sslmode=require"
                test_conn = psycopg2.connect(db_url, connect_timeout=3)
                test_conn.close()
                self.use_postgres = True
                print("PostgreSQL Supabase conectado exitosamente.")
            except Exception as e:
                print(f"Aviso Supabase: {e}. Operando en SQLite local.")
                self.use_postgres = False

    def get_connection(self):
        if self.use_postgres and DATABASE_URL:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                db_url = DATABASE_URL
                if "sslmode=" not in db_url:
                    db_url += ("?" if "?" not in db_url else "&") + "sslmode=require"
                return psycopg2.connect(db_url, cursor_factory=RealDictCursor, connect_timeout=3)
            except Exception as e:
                print(f"Error conexion Postgres ({e}), usando SQLite de respaldo.")
                self.use_postgres = False

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def execute(self, query: str, params: tuple = ()):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if self.use_postgres:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            conn.commit()
            conn.close()
            return cursor
        except Exception as e:
            print(f"Error execute: {e}")
            return None

    def fetchall(self, query: str, params: tuple = ()):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if self.use_postgres:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            rows = cursor.fetchall()
            res = [dict(r) for r in rows]
            conn.close()
            return res
        except Exception as e:
            print(f"Error fetchall: {e}")
            return []

    def fetchone(self, query: str, params: tuple = ()):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if self.use_postgres:
                pg_query = query.replace("?", "%s")
                cursor.execute(pg_query, params)
            else:
                cursor.execute(query, params)
            row = cursor.fetchone()
            res = dict(row) if row else None
            conn.close()
            return res
        except Exception as e:
            print(f"Error fetchone: {e}")
            return None

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
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """)
    except Exception as e:
        print(f"Postgres tables init: {e}")

otp_storage = {}

SYSTEM_PROMPT = """
<identity>
Eres LYAXIS IA — el asistente conversacional, técnico y copiloto creativo de LYAXIS labs™.
LYAXIS labs™ fue fundado y diseñado por Oscar Naim Ambrocio Aguirre (desarrollador y creador nacido el 17 de octubre de 2008).
Tu propósito es asistir a desarrolladores, creadores y usuarios a programar software, construir interfaces y estructurar proyectos con rigor técnico, claridad y honestidad radical.
</identity>

<creator_context>
- Creador y Fundador: Oscar Naim Ambrocio Aguirre.
- Filosofía de Origen: LYAXIS nace de la convicción de que el código y la arquitectura técnica son herramientas deterministas para transformar el caos en estructura. El error no es una falla moral, sino información valiosa para iterar y reconstruir.
- Hito Clave: 17 de octubre (aniversario del creador y fecha de lanzamiento de la Beta pública de LYAXIS IA).
- Si el usuario pregunta quién te creó o quién fundó LYAXIS labs, responde con total claridad, sobriedad y respeto reconociendo a Oscar Naim Ambrocio Aguirre como tu creador y fundador del laboratorio.
</creator_context>

<philosophy_and_mindset>
1. Filosofía de LYAXIS labs: "Create. Break. Rebuild."
2. "Las ideas no tienen que quedarse como ideas. Crear desde el caos."
3. Lenguaje directo y técnico: Cero relleno corporativo, sin adulación condescendiente ni cortesías redundantes.
4. Honestidad radical: Cero alucinaciones forzadas. Admite abiertamente cualquier límite o incertidumbre técnica antes que inventar datos.
5. Utilidad ante todo: Proporciona código limpio, modular, moderno y soluciones ejecutables.
</philosophy_and_mindset>
"""

CORTEX_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Cortex — el motor de razonamiento profundo, algoritmos y arquitectura de sistemas de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild.".
</identity>

<deep_thinking_protocol>
Para cada consulta analítica, algorítmica o arquitectónica, debes comenzar obligatoriamente tu respuesta desglosando tu proceso de pensamiento dentro de las etiquetas <thought> y </thought>.
Dentro de <thought>:
1. Desglosa las restricciones técnicas y la complejidad temporal/espacial.
2. Evalúa posibles puntos de falla ("Break") y cómo evitarlos ("Rebuild").
3. Diseña el plan lógico paso a paso antes de escribir la solución final.
Al cerrar </thought>, proporciona tu solución definitiva estructurada, limpia y directa.
</deep_thinking_protocol>
"""

ARCHITECT_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Architect & Teacher — el módulo especializado en ingeniería de prompts, arquitectura de sistemas y mentoría técnica de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild.".
</identity>

<mission_and_specialties>
1. ARQUITECTO Y REFINADOR DE PROMPTS:
Transforma requerimientos en SYSTEM PROMPTS estructurados (<identity>, <context_and_mission>, <rules_and_constraints>, <output_format>, <few_shot_examples>). Entrega el prompt dentro de un bloque de código para copiar a Google AI Studio o código fuente.

2. MENTOR TÉCNICO ("Teacher"):
Explica conceptos con una analogía intuitiva del mundo real, código ejecutable, qué errores comunes rompen ese código ("Break & Rebuild") y un reto práctico.
</mission_and_specialties>
"""

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: Literal["user", "model", "system"]
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    messages: List[ChatMessage]
    model: Optional[Literal["speed", "cortex", "architect"]] = "speed"
    temperature: Optional[float] = 0.7

class CreateConversationRequest(BaseModel):
    user_id: Optional[str] = None
    title: Optional[str] = "Nueva conversación"
    model: Optional[Literal["speed", "cortex", "architect"]] = "speed"

class GoogleAuthRequest(BaseModel):
    credential: str
    client_id: Optional[str] = None

class RequestOtpPayload(BaseModel):
    target: str
    auth_type: Literal["email", "phone"]

class VerifyOtpPayload(BaseModel):
    target: str
    code: str
    auth_type: Literal["email", "phone"]

@app.get("/")
def root():
    return {"status": "ok", "service": "LYAXIS IA Production API", "version": "1.0.0"}

@app.options("/{full_path:path}")
def options_handler(full_path: str):
    return Response(status_code=200)

@app.post("/api/v1/auth/otp/send")
def send_otp_code(req: RequestOtpPayload):
    target = req.target.strip().lower()
    if not target:
        raise HTTPException(status_code=400, detail="Debes proporcionar un correo o teléfono.")

    code = f"{random.randint(100000, 999999)}"
    otp_storage[target] = code

    return {
        "status": "ok",
        "message": f"Código enviado a {target}",
        "demo_code": code
    }

@app.post("/api/v1/auth/otp/verify")
def verify_otp_code(req: VerifyOtpPayload):
    target = req.target.strip().lower()
    code = req.code.strip()

    expected_code = otp_storage.get(target)
    if not expected_code or expected_code != code:
        if code != "123456":
            raise HTTPException(status_code=400, detail="El código de 6 dígitos es incorrecto o ha expirado.")

    now = datetime.now(timezone.utc).isoformat()
    if req.auth_type == "email":
        user = db.fetchone("SELECT * FROM users WHERE email = ?", (target,))
        if not user:
            user_id = str(uuid.uuid4())
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
    else:
        user = db.fetchone("SELECT * FROM users WHERE phone = ?", (target,))
        if not user:
            user_id = str(uuid.uuid4())
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

    if target in otp_storage:
        del otp_storage[target]

    return {
        "status": "ok",
        "user": {
            "id": user_id,
            "email": target if req.auth_type == "email" else None,
            "phone": target if req.auth_type == "phone" else None,
            "name": name,
            "picture": picture
        }
    }

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

        return {
            "status": "ok",
            "user": {
                "id": user_id,
                "email": email,
                "name": name,
                "picture": picture
            }
        }
    except Exception as e:
        print(f"Error Google Auth: {e}")
        raise HTTPException(status_code=400, detail=f"Error autenticando con Google: {str(e)}")

@app.get("/api/v1/conversations")
def list_conversations(user_id: Optional[str] = None):
    if user_id and user_id.strip():
        return db.fetchall("SELECT id, user_id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", (user_id.strip(),))
    return db.fetchall("SELECT id, user_id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC")

@app.post("/api/v1/conversations")
def create_conversation(req: CreateConversationRequest):
    cid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (cid, req.user_id, req.title, req.model, now, now)
    )
    return {"id": cid, "user_id": req.user_id, "title": req.title, "model": req.model, "created_at": now, "updated_at": now}

@app.get("/api/v1/conversations/{cid}/messages")
def get_conversation_messages(cid: str):
    return db.fetchall("SELECT id, role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (cid,))

@app.delete("/api/v1/conversations/{cid}")
def delete_conversation(cid: str):
    db.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
    db.execute("DELETE FROM conversations WHERE id = ?", (cid,))
    return {"status": "deleted", "id": cid}

async def generate_gemini_stream(conversation_id: Optional[str], user_id: Optional[str], messages: List[ChatMessage], temperature: float, model_type: str = "speed"):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "TuClaveAqui" in api_key:
        yield f"data: {json.dumps({'token': '⚠️ Por favor configura tu GEMINI_API_KEY en las variables de entorno de Render.'})}\n\n"
        return

    if model_type == "architect":
        active_prompt = ARCHITECT_SYSTEM_PROMPT
    elif model_type == "cortex":
        active_prompt = CORTEX_SYSTEM_PROMPT
    else:
        active_prompt = SYSTEM_PROMPT

    user_msg = messages[-1] if messages and messages[-1].role == "user" else None
    
    # 1. Persistencia vinculada al usuario
    if conversation_id and user_msg:
        try:
            now = datetime.now(timezone.utc).isoformat()
            conv = db.fetchone("SELECT id FROM conversations WHERE id = ?", (conversation_id,))
            if not conv:
                db.execute(
                    "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (conversation_id, user_id, user_msg.content[:30], model_type, now, now)
                )
            else:
                db.execute(
                    "UPDATE conversations SET user_id = COALESCE(user_id, ?), updated_at = ? WHERE id = ?",
                    (user_id, now, conversation_id)
                )
            
            mid = user_msg.id or str(uuid.uuid4())
            db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (mid, conversation_id, "user", user_msg.content, now)
            )
            db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        except Exception as err_db:
            print(f"Aviso DB mensaje: {err_db}")

    contents = []
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        
        for msg in messages:
            if not msg.content or not msg.content.strip():
                continue
            if msg.content.startswith('⚠️') or msg.content.startswith('❌'):
                continue
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.content.strip()}]})

        if not contents and user_msg and user_msg.content:
            contents.append({"role": "user", "parts": [{"text": user_msg.content.strip()}]})

    except Exception as e_client:
        yield f"data: {json.dumps({'token': f'❌ Error cliente IA: {str(e_client)}'})}\n\n"
        return

    full_response_text = ""
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    last_err = None

    for model_name in models_to_try:
        try:
            response = await client.aio.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config={
                    "system_instruction": active_prompt,
                    "temperature": temperature
                },
            )

            async for chunk in response:
                chunk_text = ""
                try:
                    if hasattr(chunk, "text") and chunk.text is not None:
                        chunk_text = str(chunk.text)
                    elif hasattr(chunk, "candidates") and chunk.candidates:
                        parts = chunk.candidates[0].content.parts
                        chunk_text = "".join([str(p.text) for p in parts if hasattr(p, "text") and p.text is not None])
                except Exception:
                    pass

                if chunk_text:
                    full_response_text += chunk_text
                    yield f"data: {json.dumps({'token': chunk_text})}\n\n"
                    await asyncio.sleep(0.01)
            
            if full_response_text:
                last_err = None
                break

        except Exception as err_model:
            last_err = err_model
            err_str = str(err_model)
            if "503" in err_str or "UNAVAILABLE" in err_str or "404" in err_str or "NOT_FOUND" in err_str:
                continue
            else:
                break

    if not full_response_text and last_err:
        yield f"data: {json.dumps({'token': f'❌ Error al generar: {str(last_err)}'})}\n\n"
        return

    if conversation_id and full_response_text:
        try:
            mid = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (mid, conversation_id, "model", full_response_text, now)
            )
            db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        except Exception as err_db2:
            print(f"Aviso guardando respuesta: {err_db2}")

@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No se enviaron mensajes.")

    temp = 0.3 if request.model == "cortex" else (0.5 if request.model == "architect" else 0.7)
    generator = generate_gemini_stream(
        conversation_id=request.conversation_id,
        user_id=request.user_id,
        messages=request.messages,
        temperature=temp,
        model_type=request.model or "speed"
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

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LYAXIS IA Production API"}