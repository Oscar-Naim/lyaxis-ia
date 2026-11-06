---
author: Oscar Naim
branch: fix/maintenance-audit-green
status: in-progress
---
# Mantenimiento y Resolución de Auditoría (100% Verde)

## Intent
Resolver los hallazgos identificados en la auditoría de solo lectura para alinear el repositorio con los principios de la Constitución v1.0.0 (Honestidad Radical, Cero Sobreingeniería, Verificación Empírica y Protección de Despliegue): corregir el test de 60 FPS en MessageBubble.tsx, sanear imports y tipado en ChatView.tsx y Sidebar.tsx para pasar tsc -b, y autenticar la llamada de telemetría en test_token_governance.py.

## Scope
- In:
  - `frontend/src/components/MessageBubble.tsx`: Reemplazar `backdropFilter: 'blur(...)'` por fondo translúcido plano de alto rendimiento composite.
  - `frontend/src/components/ChatView.tsx` y `frontend/src/components/Sidebar.tsx`: Eliminar variables e imports no utilizados detectados por `tsc -b`.
  - `backend/test_token_governance.py`: Adjuntar token de sesión / HMAC válido para la petición `GET /api/v1/conversations/...`.
- Out:
  - No alterar contratos de API ni endpoints de producción.
  - No introducir dependencias nuevas.

## Checklist
- [x] Retirar `backdropFilter` en `MessageBubble.tsx` — Check: `npx vitest run src/__tests__/milestone2.stress.test.ts` pasa sin errores (25/25 tests PASS).
- [x] Limpiar variables e imports huérfanos en `ChatView.tsx` y `Sidebar.tsx` — Check: `cd frontend; npx tsc -b` compila con 0 errores y `npm run build` genera bundles limpios en 1.99s.
- [x] Autenticar consulta en `test_token_governance.py` — Check: `cd backend; .\venv\Scripts\python.exe test_token_governance.py` finaliza exitosamente con código 0 ("SUITE DE GOBERNANZA DE TOKENS SUPERADA AL 100%").
- [x] Verificación integral de suites — Check: `npm run test:run` (74/74 tests PASS) y pruebas de backend (`unittest` 6/6 OK, `test_disconnect_empirical.py` 4/4 SUCCESS, `test_token_governance.py` 100% PASS).

## Evidence
- `npx vitest run src/__tests__/milestone2.stress.test.ts`: 25 passed in 3.22s.
- `cd frontend; npx tsc -b`: 0 errors.
- `cd frontend; npm run test:run`: 74 passed across 3 test files in 3.56s.
- `cd backend; .\venv\Scripts\python.exe test_token_governance.py`: Exit code 0, telemetría validada con HTTP 200.
- `cd backend; .\venv\Scripts\python.exe test_disconnect_empirical.py`: 4/4 escenarios exitosos.
- `cd backend; .\venv\Scripts\python.exe -m unittest discover tests/`: 6/6 pruebas pasadas.

## Next
- Generar el commit y Pull Request para revisión e integración en `main`.
