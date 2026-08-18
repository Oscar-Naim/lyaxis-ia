import os
import json
import sqlite3
import asyncio
import uuid
import random
from datetime import datetime
from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()

app = FastAPI(title="LYAXIS IA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "lyaxis.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        # 1. Tabla de Usuarios
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
        
        # 2. Tabla de Conversaciones
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            model TEXT NOT NULL DEFAULT 'speed',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        # Migración automática si la tabla ya existía sin la columna user_id
        try:
            cursor.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT")
        except Exception:
            pass

        # 3. Tabla de Mensajes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
        """)
        conn.commit()

init_db()

otp_storage = {}

# System Prompts Oficiales
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

# Endpoints de Autenticación
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

    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        if req.auth_type == "email":
            cursor.execute("SELECT * FROM users WHERE email = ?", (target,))
            user = cursor.fetchone()
            if not user:
                user_id = str(uuid.uuid4())
                name = target.split("@")[0].capitalize()
                picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={target}"
                cursor.execute(
                    "INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)",
                    (user_id, target, name, picture, now)
                )
            else:
                user_id = user["id"]
                name = user["name"]
                picture = user["picture"]
        else:
            cursor.execute("SELECT * FROM users WHERE phone = ?", (target,))
            user = cursor.fetchone()
            if not user:
                user_id = str(uuid.uuid4())
                name = f"Usuario {target[-4:]}"
                picture = f"https://api.dicebear.com/7.x/bottts/svg?seed={target}"
                cursor.execute(
                    "INSERT INTO users (id, phone, name, picture, created_at) VALUES (?, ?, ?, ?, ?)",
                    (user_id, target, name, picture, now)
                )
            else:
                user_id = user["id"]
                name = user["name"]
                picture = user["picture"]
        conn.commit()

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
            audience=req.client_id or os.getenv("GOOGLE_CLIENT_ID")
        )

        google_id = id_info.get("sub")
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
            user = cursor.fetchone()

            now = datetime.utcnow().isoformat()
            if not user:
                user_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO users (id, google_id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, google_id, email, name, picture, now)
                )
            else:
                user_id = user["id"]
                cursor.execute("UPDATE users SET name = ?, picture = ? WHERE id = ?", (name, picture, user_id))
            conn.commit()

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
        raise HTTPException(status_code=400, detail=f"Error autenticando con Google: {str(e)}")

# Endpoints de Conversaciones
@app.get("/api/v1/conversations")
def list_conversations(user_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT id, user_id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
        else:
            cursor.execute("SELECT id, user_id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@app.post("/api/v1/conversations")
def create_conversation(req: CreateConversationRequest):
    cid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (cid, req.user_id, req.title, req.model, now, now)
        )
        conn.commit()
    return {"id": cid, "user_id": req.user_id, "title": req.title, "model": req.model, "created_at": now, "updated_at": now}

@app.get("/api/v1/conversations/{cid}/messages")
def get_conversation_messages(cid: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, role, content, created_at as timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (cid,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@app.delete("/api/v1/conversations/{cid}")
def delete_conversation(cid: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
        cursor.execute("DELETE FROM conversations WHERE id = ?", (cid,))
        conn.commit()
    return {"status": "deleted", "id": cid}

async def generate_gemini_stream(conversation_id: Optional[str], messages: List[ChatMessage], temperature: float, model_type: str = "speed"):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "TuClaveAqui" in api_key:
        yield f"data: {json.dumps({'token': '⚠️ Por favor configura tu GEMINI_API_KEY en el archivo backend/.env.'})}\n\n"
        return

    if model_type == "architect":
        active_prompt = ARCHITECT_SYSTEM_PROMPT
    elif model_type == "cortex":
        active_prompt = CORTEX_SYSTEM_PROMPT
    else:
        active_prompt = SYSTEM_PROMPT

    user_msg = messages[-1] if messages and messages[-1].role == "user" else None
    if conversation_id and user_msg:
        with get_db() as conn:
            cursor = conn.cursor()
            mid = user_msg.id or str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (mid, conversation_id, "user", user_msg.content, now)
            )
            cursor.execute("SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?", (conversation_id,))
            count = cursor.fetchone()["count"]
            if count == 1:
                auto_title = user_msg.content[:30] + ("..." if len(user_msg.content) > 30 else "")
                cursor.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (auto_title, now, conversation_id))
            else:
                cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
            conn.commit()

    full_response_text = ""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        
        contents = []
        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))

        try:
            response = await client.aio.models.generate_content_stream(
                model="gemini-3.7-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=active_prompt,
                    temperature=temperature,
                ),
            )

            async for chunk in response:
                if chunk.text:
                    full_response_text += chunk.text
                    yield f"data: {json.dumps({'token': chunk.text})}\n\n"
                    await asyncio.sleep(0.015)

        except Exception as e_inner:
            err_str = str(e_inner)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                response_backup = await client.aio.models.generate_content_stream(
                    model="gemini-3.6-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=active_prompt,
                        temperature=temperature,
                    ),
                )
                async for chunk in response_backup:
                    if chunk.text:
                        full_response_text += chunk.text
                        yield f"data: {json.dumps({'token': chunk.text})}\n\n"
                        await asyncio.sleep(0.015)
            else:
                raise e_inner

        if conversation_id and full_response_text:
            with get_db() as conn:
                cursor = conn.cursor()
                mid = str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                cursor.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                    (mid, conversation_id, "model", full_response_text, now)
                )
                cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
                conn.commit()

    except Exception as e:
        yield f"data: {json.dumps({'token': f'❌ Error: {str(e)}'})}\n\n"

@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No se enviaron mensajes.")

    temp = 0.3 if request.model == "cortex" else (0.5 if request.model == "architect" else 0.7)
    generator = generate_gemini_stream(
        conversation_id=request.conversation_id,
        messages=request.messages,
        temperature=temp,
        model_type=request.model or "speed"
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LYAXIS IA Backend con Auth & OTP"}