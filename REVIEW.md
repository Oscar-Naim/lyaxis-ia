# REVIEW.md — Directrices de Revisión de LYAXIS IA

> Documento ratificado junto con la Constitución (`v1.0.0`). Define las reglas que el revisor (`review`, `python-reviewer`, `react-reviewer`, `refuter-*`) ejecuta rigurosamente antes de cualquier integración.

---

## 1. Conteo de Resumen Obligatorio
Toda revisión DEBE comenzar indicando el conteo de hallazgos en la primera línea:
> **"X hallazgos: Y bloqueantes, Z nits"**

Si no hay bloqueantes ni advertencias, se declara:
> **"0 hallazgos: listo para merge"**

---

## 2. Qué constituye un fallo aquí (Defectos críticos del proyecto)
Un hallazgo se clasifica como **bloqueante** si incurre en cualquiera de los siguientes escenarios:

1. **Ruptura de streaming SSE:** Modificaciones en backend o frontend que bloqueen la respuesta completa en memoria en vez de transmitir eventos en tiempo real.
2. **Exposición o fuga de secretos:** Credenciales, claves privadas o tokens en diffs de código o archivos públicos.
3. **Sobreingeniería o abstracciones prematuras:** Introducción de patrones innecesarios, factories o capas de indirección que violen el principio de Cero Sobreingeniería.
4. **Fallas en la persistencia dual:** Operaciones de base de datos en Supabase que omitan el mecanismo de fallback determinista a SQLite WAL.
5. **Ruptura de compilación o tipado:** Errores de tipo en TypeScript (`strict: true`) o modelos Pydantic incompatibles.
6. **Violación de Honestidad Radical:** Afirmaciones en PRs o código sobre funcionalidades probadas cuando no existen pruebas ejecutables que lo respalden.
7. **Bypass del flujo de despliegue:** Intentos de push o merge directos a la rama principal `main`.

---

## 3. Límite de nits (Nit cap)
- **Máximo 3 nits por revisión.** Los detalles de estilo cosmético secundarios que excedan este número se descartan automáticamente para mantener el foco en la correctitud, seguridad y rendimiento.

---

## 4. Rutas a omitir en la revisión (Paths to skip)
- `frontend/dist/` (build generado)
- `node_modules/` y `.venv/` (dependencias externas)
- `01-TOOLS/_TEMPLATE/` (scaffolding base de herramientas)
- `.rsc/backups/` (copias de seguridad del arnés)
- Archivos binarios, imágenes y capturas de pantalla (`*.png`, `*.jpg`, `*.svg`).

---

## 5. Rutas con revisión humana obligatoria (Always-human paths)
Los cambios en los siguientes módulos son sensibles y requieren aprobación explícita de un ingeniero antes de integrarse:
- `backend/core/auth*` y generadores de tokens HMAC (`backend/main.py`)
- Configuraciones de infraestructura y despliegue: `render.yaml`, `frontend/vercel.json`
- Variables de entorno críticas: `backend/.env.example`, `frontend/.env.example`
- Migraciones y esquema de base de datos (`DATABASE_URL`, pool Supabase).

