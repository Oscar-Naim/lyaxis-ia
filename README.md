# LYAXIS IA — Create. Break. Rebuild.

Plataforma de inteligencia artificial multi-motor de nivel producción especializada en código, algoritmos, arquitectura de sistemas y razonamiento determinista.

- **Frontend en Producción:** [https://lyaxis-ia.vercel.app/](https://lyaxis-ia.vercel.app/)
- **Estudio Web Autónomo:** [https://lyaxis-webforge.vercel.app/](https://lyaxis-webforge.vercel.app/)
- **API & Backend:** Desplegado en [Render](https://render.com) con respaldo persistente en [Supabase](https://supabase.com).

---

## 🚀 Arquitectura del Sistema

```
                      ┌──────────────────────────────────────────────┐
                      │          Frontend (Vercel)                   │
                      │  React 19 + TypeScript + Vite + Tailwind/CSS │
                      │  Streaming SSE + KaTeX + Highlight.js        │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTPS / CORS Seguro
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          Backend API (Render)                │
                      │  FastAPI + Python 3.12                       │
                      │  Tokens HMAC-SHA256 + Rate Limiting          │
                      └───────┬──────────────────────────────┬───────┘
                              │                              │
                              ▼                              ▼
             ┌─────────────────────────────┐  ┌─────────────────────────────┐
             │   Persistencia & Datos      │  │     Motores Neuronales      │
             │  PostgreSQL (Supabase Pool) │  │  Groq + Google Gemini       │
             │  Fallback SQLite Respaldo   │  │  NVIDIA NIM + OpenRouter    │
             └─────────────────────────────┘  └─────────────────────────────┘
```

---

## 🛠️ Configuración y Variables de Entorno

### 1. Backend (`backend/`)
Copia la plantilla de variables de entorno y ajusta tus credenciales:
```bash
cp backend/.env.example backend/.env
```

| Variable | Requerida | Descripción |
| :--- | :---: | :--- |
| `AUTH_SECRET` | **Sí (Prod)** | Secreto de al menos 32 caracteres para firma HMAC de sesiones. |
| `DATABASE_URL` | **Recomendada** | Conexión PostgreSQL a Supabase (`?sslmode=require`). |
| `GROQ_API_KEY` | Opcional | Clave para modelos ultra veloces (Llama 3.3). |
| `GEMINI_API_KEY` | Opcional | Clave para modelos Google Gemini. |
| `NVIDIA_API_KEY` | Opcional | Clave para NVIDIA NIM / Llama 3 70B/8B. |
| `GOOGLE_CLIENT_ID` | Opcional | Client ID para autenticación con Google OAuth 2.0. |
| `ALLOWED_ORIGINS` | Opcional | Dominios autorizados para CORS separados por coma. |
| `SMTP_*` | Opcional | Servidor SMTP para despacho real de códigos OTP. |

### 2. Frontend (`frontend/`)
```bash
cp frontend/.env.example frontend/.env
```

| Variable | Descripción |
| :--- | :--- |
| `VITE_API_URL` | URL del backend (ej. `https://lyaxis-ia.onrender.com` o `http://localhost:8000`). |
| `VITE_GOOGLE_CLIENT_ID` | Web Client ID de Google Cloud Console. |

---

## 💻 Desarrollo Local

### Iniciar Backend
```bash
cd backend
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Pruebas Automatizadas y CI/CD

El repositorio incluye integración continua configurada en GitHub Actions (`.github/workflows/ci.yml`):

- **Backend:**
  ```bash
  pytest backend/tests/
  # o con unittest estándar:
  python -m unittest discover backend/tests/
  ```
- **Frontend:**
  ```bash
  cd frontend
  npm run lint       # Auditoría oxlint
  npx tsc -b         # Verificación estricta de tipos TypeScript
  npm run test:run   # Pruebas unitarias vitest
  ```

---

## 🔒 Seguridad, Privacidad y Cumplimiento Legal

1. **Aislamiento de Cuentas:** Se exige token criptográfico HMAC-SHA256 verificado en todas las rutas de conversaciones privadas. No se admiten suplantaciones de cuentas registradas sin firma válida.
2. **Protección CORS:** Restringido a los orígenes autorizados del proyecto en Vercel y localhost en desarrollo.
3. **Mitigación DDoS & Rate Limiting:** Límite por IP para emisión de códigos OTP (máx 5/min) y streaming de chat (máx 40/min).
4. **Persistencia OTP:** Los códigos de inicio de sesión se guardan en base de datos con expiración y límite de intentos para sobrevivir reinicios de servidores efímeros.
5. **Cumplimiento Legal (México & Internacional):**
   - Aviso de Privacidad Integral conforme a la **LFPDPPP** de México y **GDPR** ([privacy.html](https://lyaxis-ia.vercel.app/privacy.html)).
   - Adherencia a la **Google API Services User Data Policy** para inicio de sesión con Google OAuth.
   - Herramientas de autoservicio para el ejercicio de **Derechos ARCO**: descarga completa de datos en JSON y eliminación permanente de cuenta.

---

## 📦 Despliegue en Producción

- **Render (Backend):** Utiliza la configuración de Infraestructura como Código provista en `render.yaml` o construye mediante `backend/Dockerfile`.
- **Vercel (Frontend):** Conecta el repositorio con Framework Preset Vite. Los iconos PWA y políticas de cabeceras de seguridad están configurados en `frontend/vercel.json`.

---

© 2026 **LYAXIS labs™**. Todos los derechos reservados.
