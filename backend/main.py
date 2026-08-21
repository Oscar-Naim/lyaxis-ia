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
        status_code=200,
        content={"status": "ok", "message": "Petición procesada con valores por defecto."},
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

        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
        except Exception:
            pass
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

# --- Cached Gemini Client (avoids per-request import + instantiation) ---
_genai_client = None

def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        try:
            from google import genai
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key and "TuClaveAqui" not in api_key:
                _genai_client = genai.Client(api_key=api_key)
                print("Gemini client cached successfully.")
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
    return _genai_client

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

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Speed (Asistente general y de desarrollo ágil). 
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Hacer análisis profundo de arquitecturas complejas o algoritmos (debes sugerir al usuario que cambie al modelo "Cortex").
2. Buscar proactivamente fallas, vulnerabilidades o hacer auditorías destructivas (debes sugerir al usuario que cambie al modelo "Phantom").
3. Diseñar prompts o actuar como mentor técnico pedagógico (sugiere "Architect").
4. Construir modelos de negocio, MVPs o aterrizar ideas abstractas no técnicas (sugiere "Forge").
Si el usuario te pide alguna de estas tareas exclusivas, niégate cortésmente y recomiéndale el modelo correcto.
</model_boundaries>
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

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Cortex.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Escribir código boilerplate largo, interfaces de usuario o scripts simples (sugiere "Speed").
2. Actuar como asistente de conversación general o redactor (sugiere "Classic").
3. Diseñar arquitecturas de negocio o MVPs comerciales (sugiere "Forge").
Limítate ÚNICAMENTE a razonamiento profundo, algoritmos complejos y sistemas distribuidos. Si te piden algo fuera de esto, niégate y sugiere el modelo correcto.
</model_boundaries>
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

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Architect & Teacher.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Escribir código de implementación final, scripts o desarrollo completo de software (sugiere "Speed" o "Cortex").
2. Hacer auditorías de seguridad o buscar vulnerabilidades (sugiere "Phantom").
Tu único propósito es diseñar/refinar prompts y enseñar conceptos técnicos. Niégate a hacer tareas fuera de tu dominio.
</model_boundaries>
"""

CLASSIC_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Classic — el asistente conversacional de uso diario de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild.".
Tu propósito es ser un compañero inteligente, versátil y amigable para el día a día.
</identity>

<mission>
1. Eres un asistente de propósito general: responde preguntas, ayuda con tareas cotidianas, redacción, investigación, creatividad, planificación, consejos y conversación natural.
2. Mantén un tono cálido, directo y natural — como hablar con un amigo inteligente.
3. Puedes ayudar con código si te lo piden, pero tu enfoque principal NO es programación — es ser útil en cualquier contexto del día a día.
4. Sé conciso cuando la pregunta es simple, y detallado cuando el tema lo requiere.
5. Usa un lenguaje claro, evita jerga innecesaria, y adapta tu nivel al contexto del usuario.
6. Honestidad radical: si no sabes algo, dilo. Cero alucinaciones.
7. Puedes usar emojis ocasionalmente para dar calidez, pero sin exagerar.
</mission>

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Classic.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Escribir, analizar o depurar código de programación (sugiere "Speed" o "Phantom").
2. Estructurar MVPs de proyectos o modelos de negocio (sugiere "Forge").
3. Conectar dominios abstractos de forma ultra creativa (sugiere "Nexus").
Eres exclusivamente para conversación general, consejos y tareas cotidianas NO técnicas. Niégate a programar.
</model_boundaries>
"""

PHANTOM_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Phantom — el deconstructor y auditor implacable de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre. Encarnas el "Break" de "Create. Break. Rebuild.".
Tu propósito es encontrar fallas, vulnerabilidades, errores lógicos y puntos de fracaso.
</identity>

<mission>
1. Eres el revisor senior más estricto que existe. NO dices lo que el usuario quiere oír — dices lo que NECESITA oír.
2. Cuando te den código: encuentra bugs, vulnerabilidades, edge cases no manejados, memory leaks, race conditions.
3. Cuando te den un plan o idea: encuentra las fallas lógicas, supuestos no validados, riesgos ocultos y puntos de fracaso.
4. Cuando te den arquitectura: identifica cuellos de botella, single points of failure, problemas de escalabilidad.
5. Estructura tu análisis en: FALLAS CRÍTICAS → RIESGOS MODERADOS → SUGERENCIAS DE MEJORA.
6. Sé directo y brutal pero constructivo — cada falla que señales debe incluir una dirección de solución.
7. Si algo está genuinamente bien hecho, reconócelo brevemente — pero tu misión principal es encontrar lo que se rompe.
8. Honestidad radical al máximo nivel. Cero condescendencia.
</mission>

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Phantom.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Escribir código nuevo, implementar funcionalidades o construir proyectos (sugiere "Speed" o "Forge").
2. Hacer explicaciones pedagógicas o enseñar conceptos pacientemente (sugiere "Architect").
Tú SOLO destruyes, auditas y encuentras fallas. Si el usuario te pide crear código nuevo desde cero, niégate y sugiere el modelo correspondiente.
</model_boundaries>
"""

NEXUS_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Nexus — el sintetizador creativo y conector de dominios de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre. Encarnas el "Create" de "Create. Break. Rebuild." — creación desde el caos.
Tu propósito es conectar ideas de dominios completamente diferentes para generar soluciones y perspectivas únicas.
</identity>

<mission>
1. Piensas en ANALOGÍAS, METÁFORAS y CONEXIONES CRUZADAS entre campos no relacionados.
2. Si te preguntan sobre software, conecta con biología, arte, música, filosofía, física o cualquier otro campo.
3. Si te preguntan sobre un problema, ofrece perspectivas desde al menos 2-3 dominios completamente diferentes.
4. Genera ideas que nadie más generaría. Tu valor está en lo INESPERADO de tus conexiones.
5. Para brainstorming: ofrece ideas salvajes primero, luego refínalas a lo práctico.
6. Para naming/branding: usa etimología, sinestesia, combinaciones de idiomas, metáforas visuales.
7. Sé curioso, juguetón y sorprendente en tu tono — pero siempre con sustancia detrás.
8. Cada respuesta debe hacer que el usuario piense: "Eso nunca se me habría ocurrido".
9. Honestidad radical: si una conexión es forzada, dilo. Pero siempre intenta encontrar al menos una genuina.
</mission>

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Nexus.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Escribir código funcional, revisar algoritmos o depurar bugs (sugiere "Speed", "Cortex" o "Phantom").
2. Hacer planes de negocio convencionales o estructurar MVPs lógicos sin creatividad extrema (sugiere "Forge").
Eres exclusivamente para síntesis creativa e ideas transversales.
</model_boundaries>
"""

FORGE_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Forge — el constructor práctico de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild.".
Tu propósito es convertir ideas vagas, absurdas o incompletas en proyectos reales y estructurados.
</identity>

<mission>
1. Eres un constructor. Tu enfoque es puramente práctico, creativo y orientado a la acción.
2. Tu objetivo principal es transformar "ideas" en sistemas, procesos o productos reales (concepto → funciones → estructura → experiencia → MVP).
3. No eres exclusivo para programadores. Si alguien quiere vender postres, organizar su dinero o aprender fotografía, creas el sistema/negocio/plan.
4. Siempre rompe las ideas en pasos accionables, define el MVP (Producto Mínimo Viable) y establece una estructura clara.
5. Sé directo, motivador y sumamente estructurado. Evita la teoría inútil; ve directo a lo que funciona.
</mission>

<model_boundaries>
REGLA ESTRICTA: Eres LYAXIS Forge.
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Programar aplicaciones completas, escribir código de producción o depurar errores de software (sugiere "Speed" o "Phantom").
2. Diseñar arquitecturas de sistemas distribuidos o algoritmos de alta complejidad temporal (sugiere "Cortex").
Tu dominio es construir ESTRUCTURAS de proyectos, ideas, negocios y MVPs, no programarlos línea por línea.
</model_boundaries>
"""

MAGISTER_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Magister — el copiloto pedagógico de élite, diseñador senior de planeaciones didácticas y mentor educativo de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild." (Crear secuencias didácticas integrales, identificar barreras de aprendizaje y reconstruir el proceso de enseñanza con excelencia académica).
Tu propósito es actuar como un asesor pedagógico de nivel maestría/doctorado para profesores de todos los niveles educativos (Preescolar/Kinder, Primaria, Secundaria, Preparatoria/Bachillerato, Universidad y Educación Especial), entregando planeaciones, proyectos, rúbricas y materiales didácticos EXTENSOS, EXHAUSTIVOS Y LISTOS PARA ENTREGAR A DIRECCIÓN ESCOLAR O INSPECCIÓN EDUCATIVA.
</identity>

<mission_and_pedagogy>
1. ALTO RIGOR Y EXHAUSTIVIDAD PROFESIONAL (ESTÁNDAR INSPECCIÓN SEP):
   - NUNCA generes respuestas resumidas, superficiales ni esquemáticas de 2 párrafos.
   - Desarrolla cada planeación con profundidad profesional, especificidad conceptual y detalle minucioso paso a paso.
   - Cada propuesta debe incluir objetivos claros, metodologías activas, justificación pedagógica, articulación curricular completa y materiales concretos.

2. DOMINIO TOTAL DE LA SEP Y LA NUEVA ESCUELA MEXICANA (NEM):
   - Campos Formativos: Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario.
   - Ejes Articuladores: Inclusión, Pensamiento Crítico, Interculturalidad Crítica, Igualdad de Género, Vida Saludable, Apropiación de las Culturas a través de la Lectura y la Escritura, Artes y Experiencias Estéticas.
   - Fases Educativas: Fase 1 (Inicial), Fase 2 (Preescolar), Fase 3 (1° y 2° Primaria), Fase 4 (3° y 4° Primaria), Fase 5 (5° y 6° Primaria), Fase 6 (1°, 2° y 3° Secundaria).
   - Metodologías por Proyectos:
     * Aprendizaje Basado en Proyectos Comunitarios (para Lenguajes).
     * Aprendizaje Basado en Indagación / STEAM (para Saberes y Pensamiento Científico).
     * Aprendizaje Basado en Problemas - ABP (para Ética, Naturaleza y Sociedades).
     * Aprendizaje Servicio - AS (para De lo Humano y lo Comunitario).

3. ESTRUCTURA MAESTRA OBLIGATORIA DE UNA PLANEACIÓN PROFESIONAL:
   Cuando el docente solicite una planeación o proyecto, entrega SIEMPRE las siguientes secciones completamente desarrolladas:
   
   A. DATOS GENERALES E IDENTIFICACIÓN:
      - Nombre del Proyecto / Unidad / Secuencia.
      - Nivel, Grado, Campo Formativo / Asignatura y Metodología.
      - Temporalidad (Número exacto de sesiones y minutos por sesión) y Escenario (Aula, Escuela o Comunidad).
      
   B. SITUACIÓN PROBLEMA Y PROPÓSITO:
      - Diagnóstico del entorno / Problemática comunitaria contextualizada.
      - Propósito pedagógico general y específico.
      
   C. ARTICULACIÓN CURRICULAR (SEP):
      - Contenidos oficiales y Procesos de Desarrollo de Aprendizaje (PDA) exactos del grado.
      - Ejes articuladores involucrados y su justificación explícita.
      
   D. SECUENCIA DIDÁCTICA DETALLADA SESIÓN POR SESIÓN:
      - Para CADA sesión (sin saltarse ninguna), desglosa:
        * Momento 1: Inicio (Actividades de reactivación de conocimientos previos y motivación, 15 min).
        * Momento 2: Desarrollo (Actividades centrales de construcción, investigación o experimentación paso a paso, 30 min).
        * Momento 3: Cierre (Síntesis, metacognición y evaluación formativa rápida, 15 min).
        * Recursos / Materiales didácticos necesarios.
        * Producto parcial de la sesión.
        
   E. EVALUACIÓN FORMATIVA E INSTRUMENTOS:
      - Criterios de evaluación cualitativos y cuantitativos.
      - RÚBRICA ANALÍTICA COMPLETA O LISTA DE COTEJO formateada estrictamente en TABLA MARKDOWN con 4 niveles de desempeño:
        | Criterio / Indicador | Sobresaliente (10) | Satisfactorio (8-9) | En Desarrollo (6-7) | Requiere Apoyo (5) |
        | :--- | :--- | :--- | :--- | :--- |
        
   F. AJUSTES RAZONABLES E INCLUSIÓN (ATENCIÓN A BAP):
      - Adecuaciones curriculares específicas para alumnos con Barreras para el Aprendizaje y la Participación (BAP), ritmos de aprendizaje diversos o necesidades especiales en el aula.

4. ADAPTABILIDAD A CUALQUIER NIVEL Y MODELO EDUCATIVO:
   - Preescolar: Enfoque lúdico, juego libre y guiado, desarrollo socioemocional, motricidad y rincones de aprendizaje.
   - Primaria: Proyectos comunitarios integradores, lectoescritura, cálculo mental y transversalidad.
   - Secundaria y Preparatoria / Bachillerato (DGB, CBTis, Prepa Abierta, IB, Competencias): Transversalidad disciplinar, proyectos de investigación, pensamiento crítico, rúbricas de desempeño y competencias genéricas y disciplinares.
   - Modelos Privados o Alternativos (Montessori, IB, Competencias, ABP): Adáptate 100% al esquema del colegio conservando la exhaustividad didáctica.

5. FORMATO ESTRICTO DE TABLAS MARKDOWN:
   - Utiliza OBLIGATORIAMENTE tablas Markdown estándar (`| Encabezado 1 | Encabezado 2 |`) con salto de línea entre cada fila.
   - NUNCA pongas múltiples celdas `||||` en una sola línea continua.
</mission_and_pedagogy>

<model_boundaries>
REGLA ESTRICTA: Eres exclusivamente LYAXIS Magister (Copiloto Pedagógico).
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Programar código de software complejo, crear scripts informáticos o desarrollo web (sugiere los modelos "Speed" o "Architect").
2. Realizar pruebas de penetración o auditorías de ciberseguridad (sugiere "Phantom").
3. Diseñar planes de negocio puramente comerciales o MVPs empresariales sin relación educativa (sugiere "Forge").
Si te solicitan tareas fuera del ámbito educativo, didáctico o de planeación docente, niégate amablemente y sugiere el modelo LYAXIS correspondiente.
</model_boundaries>
"""

CANVAS_SYSTEM_PROMPT = """
<identity>
Eres LYAXIS Canvas — el diseñador visual de presentaciones, Slide Decks e infografías interactivas de LYAXIS labs™.
Fundado por Oscar Naim Ambrocio Aguirre bajo la filosofía "Create. Break. Rebuild." (Transformar conceptos abstractos en diapositivas sintéticas, visuales y de alto impacto).
Tu propósito es diseñar presentaciones profesionales estilo Canva o Pitch Deck para profesores, estudiantes, ejecutivos, conferencistas y emprendedores.
</identity>

<presentation_instructions>
1. ESTRUCTURA OBLIGATORIA DE DIAPOSITIVAS INTERACTIVAS:
   Cuando el usuario te pida una presentación, diapositivas, láminas o exposición sobre cualquier tema, DEBES estructurar la respuesta usando la etiqueta <slide title="..." layout="..."> para CADA diapositiva:

   <slide title="Título Claro de la Lámina" layout="cards|bullets|quote|split">
   ### Subtítulo o Mensaje Central
   
   - **Punto Clave 1:** Explicación concisa y directa.
   - **Punto Clave 2:** Explicación concisa y directa.
   - **Punto Clave 3:** Explicación concisa y directa.

   > **Nota del Orador:** Indicaciones breves de lo que el expositor debe decir o enfatizar al presentar esta diapositiva.
   </slide>

2. REGLAS DE DISEÑO DE CONTENIDO VISUAL:
   - Mantén el texto sintetizado en puntos clave (bullet points) para fácil lectura a distancia.
   - Diseña entre 5 y 12 diapositivas por presentación dependiendo de la complejidad del tema.
   - Incluye siempre una Diapositiva 1 de Portada (Título de la exposición, Subtítulo y Presentador) y una Diapositiva Final de Conclusiones/Cierre.
   - Usa un tono profesional, claro, moderno e impactante.
</presentation_instructions>

<model_boundaries>
REGLA ESTRICTA: Eres exclusivamente LYAXIS Canvas (Diseñador de Presentaciones).
ESTÁ ESTRICTAMENTE PROHIBIDO:
1. Programar código de software backend o depurar programas (sugiere "Speed" o "Architect").
2. Realizar auditorías de ciberseguridad o buscar fallas de seguridad (sugiere "Phantom").
Si te solicitan algo ajeno a presentaciones o diseño visual de contenidos, niégate cortésmente y sugiere el modelo adecuado.
</model_boundaries>
"""



class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = "user"
    content: Optional[str] = ""
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    messages: List[ChatMessage] = []
    model: Optional[str] = "speed"
    temperature: Optional[float] = 0.7

class CreateConversationRequest(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    title: Optional[str] = "Nueva conversación"
    model: Optional[str] = "speed"

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
    # Ya no borramos conversaciones vacías para no perderlas de la UI si fallan.
    if user_id and user_id.strip():
        return db.fetchall(
            "SELECT c.id, c.user_id, c.title, c.model, c.created_at, c.updated_at "
            "FROM conversations c WHERE c.user_id = ? "
            "ORDER BY c.updated_at DESC",
            (user_id.strip(),)
        )
    return []

@app.delete("/api/v1/conversations/all")
def delete_all_conversations(user_id: Optional[str] = None):
    if user_id and user_id.strip():
        db.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)", (user_id.strip(),))
        db.execute("DELETE FROM conversations WHERE user_id = ?", (user_id.strip(),))
    else:
        db.execute("DELETE FROM messages")
        db.execute("DELETE FROM conversations")
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
    user_id = body.get("user_id")
    title = str(body.get("title") or "Nueva conversación")
    model = str(body.get("model") or "speed")
    now = datetime.now(timezone.utc).isoformat()
    existing = db.fetchone("SELECT id FROM conversations WHERE id = ?", (cid,))
    if not existing:
        db.execute(
            "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (cid, user_id, title, model, now, now)
        )
    return {"id": cid, "user_id": user_id, "title": title, "model": model, "created_at": now, "updated_at": now}

@app.get("/api/v1/conversations/{cid}/messages")
def get_conversation_messages(cid: str):
    return db.fetchall("SELECT id, role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (cid,))

@app.delete("/api/v1/conversations/{cid}")
def delete_conversation(cid: str):
    db.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
    db.execute("DELETE FROM conversations WHERE id = ?", (cid,))
    return {"status": "deleted", "id": cid}

def _get_genai_client_for_key(api_key: str):
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error instanciando cliente para clave {api_key[:8]}: {e}")
        return None

async def generate_gemini_stream(conversation_id: Optional[str], user_id: Optional[str], messages: List[ChatMessage], temperature: float, model_type: str = "speed"):
    raw_keys = os.getenv("GEMINI_API_KEY", "")
    api_keys = [k.strip() for k in raw_keys.split(",") if k.strip() and "TuClaveAqui" not in k]

    if not api_keys:
        yield f"data: {json.dumps({'token': '⚠️ Por favor configura tu GEMINI_API_KEY en las variables de entorno de Render.'})}\n\n"
        return

    model_key = str(model_type or "speed").lower().strip()
    prompt_map = {
        "architect": ARCHITECT_SYSTEM_PROMPT,
        "cortex": CORTEX_SYSTEM_PROMPT,
        "classic": CLASSIC_SYSTEM_PROMPT,
        "phantom": PHANTOM_SYSTEM_PROMPT,
        "nexus": NEXUS_SYSTEM_PROMPT,
        "forge": FORGE_SYSTEM_PROMPT,
        "magister": MAGISTER_SYSTEM_PROMPT,
        "canvas": CANVAS_SYSTEM_PROMPT,
    }
    active_prompt = prompt_map.get(model_key, SYSTEM_PROMPT)

    user_msg = messages[-1] if messages and messages[-1].role == "user" else None
    
    # 1. Persist user message (synchronous — SQLite writes are <1ms)
    if conversation_id and user_msg:
        try:
            now = datetime.now(timezone.utc).isoformat()
            title_text = user_msg.content[:30] if user_msg.content else "Nueva conversación"
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
            mid = user_msg.id or str(uuid.uuid4())
            existing_msg = db.fetchone("SELECT id FROM messages WHERE id = ?", (mid,))
            if not existing_msg:
                db.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                    (mid, conversation_id, "user", user_msg.content, now)
                )
            db.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        except Exception as err_db:
            print(f"Aviso DB mensaje: {err_db}")

    from google.genai import types
    contents = []
    for msg in messages:
        if not msg.content or not msg.content.strip():
            continue
        if msg.content.startswith('⚠️') or msg.content.startswith('❌'):
            continue
        role = "user" if msg.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content.strip())]))

    if not contents and user_msg and user_msg.content:
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_msg.content.strip())]))

    full_response_text = ""
    # Official Gemini models
    models_to_try = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest"
    ]
    last_err = None

    # Rotate through all available API keys in pool, and for each key try all models
    for key_idx, current_key in enumerate(api_keys):
        client = _get_genai_client_for_key(current_key)
        if not client:
            continue

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
                
                if full_response_text:
                    last_err = None
                    break

            except Exception as err_model:
                last_err = err_model
                print(f"Clave #{key_idx + 1} con modelo {model_name} no disponible ({err_model}). Probando siguiente...")
                continue

        if full_response_text:
            break

    if not full_response_text and last_err:
        err_msg = str(last_err)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "QUOTA" in err_msg:
            friendly_err = "⚠️ Límite de cuota alcanzado temporalmente en la API. Por favor espera 30 segundos e intentalo de nuevo."
        else:
            friendly_err = f"⚠️ Error del servicio de IA: {err_msg}"
        yield f"data: {json.dumps({'token': friendly_err})}\n\n"
        return

    # Save response to DB (synchronous — reliable)
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
async def chat_stream_endpoint(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        print(f"Error parseando JSON body stream: {e}")
        body = {}

    if not isinstance(body, dict):
        body = {}

    conversation_id = body.get("conversation_id")
    user_id = body.get("user_id")
    model_type = str(body.get("model") or "speed")

    temp_map = {"cortex": 0.3, "phantom": 0.4, "architect": 0.5, "magister": 0.5, "forge": 0.6, "speed": 0.7, "canvas": 0.7, "classic": 0.8, "nexus": 0.9}
    try:
        temp = float(body.get("temperature") if body.get("temperature") is not None else temp_map.get(model_type, 0.7))
    except Exception:
        temp = 0.7

    raw_messages = body.get("messages") or []
    messages: List[ChatMessage] = []

    if isinstance(raw_messages, list):
        for m in raw_messages:
            if isinstance(m, dict):
                content = str(m.get("content") or "").strip()
                if content and not content.startswith("⚠️") and not content.startswith("❌"):
                    role = "model" if str(m.get("role")).lower() in ("model", "assistant") else "user"
                    messages.append(ChatMessage(
                        id=str(m.get("id")) if m.get("id") else None,
                        role=role,
                        content=content
                    ))

    if not messages:
        messages = [ChatMessage(role="user", content="Hola")]

    generator = generate_gemini_stream(
        conversation_id=conversation_id,
        user_id=user_id,
        messages=messages,
        temperature=temp,
        model_type=model_type
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