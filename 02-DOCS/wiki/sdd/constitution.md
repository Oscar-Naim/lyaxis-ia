---
type: constitution
title: LYAXIS IA — Constitución
description: Principios innegociables de ingeniería y suelo de calidad de LYAXIS IA ("Create. Break. Rebuild.").
tags: [sdd, constitution, lyaxis]
timestamp: 2026-11-06T03:25:00Z
topic: sdd
version: v1.0.0
---

# LYAXIS IA — Constitución

> Versión: v1.0.0 · Ratificada: 2026-11-06 · Última enmienda: 2026-11-06
> Principios innegociables que gobiernan cada fase del desarrollo, arquitectura y revisión de código en LYAXIS IA / LYAXIS labs™ ("Create. Break. Rebuild.").

---

## 1. Stack canon

1. **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS / Vanilla CSS moderno. Pinned en `frontend/package.json`. Desplegado en producción en Vercel.
2. **Backend API:** Python 3.12 + FastAPI asíncrono + Uvicorn + Pydantic v2. Pinned en `backend/requirements.txt` y `runtime.txt`. Desplegado en producción en Render.
3. **Persistencia dual y resiliente:** PostgreSQL (Supabase Connection Pool) como capa primaria, con fallback determinista y transparente a SQLite local en modo WAL (`lyaxis_local.db`).
4. **Orquestación multi-modelo:** Inferencia asíncrona vía Server-Sent Events (SSE) con adaptadores dedicados para Groq, Google Gemini, NVIDIA NIM y OpenRouter.

---

## 2. Calidad e Ingeniería Radical ("Create. Break. Rebuild.")

5. **Honestidad Radical:** Cero alucinaciones, cero adulación y cero lenguaje corporativo inflado. Si una hipótesis técnica falla, un contexto es incompleto o se alcanza un límite arquitectónico, se declara de inmediato sin rodeos ni justificaciones artificiales.
6. **Cero Sobreingeniería:** Código tipado estricto (TypeScript `strict: true`, Python type hints completos con validación estricta en modelos Pydantic), modular y legible. Quedan prohibidas las abstracciones prematuras, wrappers innecesarios o patrones de diseño inflados que no resuelvan un requerimiento concreto presente.
7. **Verificación Empírica:** Ninguna tarea se da por concluida sin evidencia empírica ejecutable. Todo cambio debe validar builds de producción (`npm run build`), pruebas automatizadas (`vitest run`, `pytest`), y pruebas de integración/estrés verificables antes de solicitar aprobación.

---

## 3. Convenciones y Estructura

8. **Monolito desacoplado:** Separación limpia de fronteras:
   - `frontend/`: Aplicación cliente SPA y assets.
   - `backend/`: Servicios FastAPI, adaptadores de modelos y suites de test.
   - `01-TOOLS/`: Herramientas locales aisladas y scaffolding.
   - `02-DOCS/`: Wiki técnica, memoria del arnés y registros de decisión.
9. **Formato y commits:** Convención Gitmoji + Conventional Commits (`✨ feat(scope): ...`, `🐛 fix(scope): ...`). Mensajes de commit directos y semánticos.
10. **Contratos de API:** Respuestas HTTP con códigos de estado canónicos (2xx, 4xx, 5xx), esquemas JSON estrictos y formato de eventos SSE estándar (`data: {...}\n\n`).

---

## 4. Branching & Shipping (Protección de Despliegue)

11. **Protección estricta de producción:** El trabajo se desarrolla en ramas de feature o fix y se integra exclusivamente mediante Pull Request. Quedan terminantemente prohibidos los pushes o commits directos a `main` para proteger la estabilidad de Vercel y Render.
12. **Autoría Git humana:** La autoría de commits y PRs pertenece a la persona responsable configurada en Git. Cero etiquetas `Co-Authored-By` de IA ni pies de página generados automáticamente. Enforzado por la fase `ship`.

---

## 5. Suelo de Seguridad y Privacidad

13. **Cero secretos en repositorio:** Ninguna credencial, token HMAC o API key (`AUTH_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`, etc.) se incluye en control de versiones. Se gestionan exclusivamente en variables de entorno locales (`.env` gitignorado) y paneles de Render/Vercel.
14. **Seguridad en capas:** Tokens de sesión firmados con HMAC-SHA256, rate limiting activo por endpoint y control estricto de cabeceras CORS (`ALLOWED_ORIGINS`).

---

## 6. UX y Experiencia de Usuario

15. **Estética y accesibilidad:** Tema oscuro inmersivo futurista de alta fidelidad, contraste adecuado, renderizado de fórmulas KaTeX, formateo de sintaxis Highlight.js y diagramas Mermaid interactivos sin rupturas en layouts móviles ni de escritorio.

---

## 7. Rendimiento y Resiliencia

16. **Tolerancia a fallos:** Inferencia en streaming con baja latencia y conmutación automática e inadvertida a SQLite WAL si la conexión remota a Supabase experimenta latencia excesiva o fallos de red.

---

## 8. Gestión del Conocimiento

17. **Registro continuo de decisiones:** Cualquier decisión arquitectónica o cambio de comportamiento fundamental debe documentarse en `02-DOCS/wiki/sdd/decisions.md` con contexto, opciones y justificación.

---

## Definition of Done (Criterio de Aceptación para Merge)

Un cambio sólo se aprueba y se considera listo para merge si se cumplen TODAS las siguientes condiciones:

- [ ] Formateador y linter pasan sin errores (`oxlint`, validación Python).
- [ ] Tipado estricto verificado sin advertencias (TypeScript y Pydantic).
- [ ] Pruebas automatizadas ejecutadas y superadas (`vitest run` en frontend, `pytest` en backend).
- [ ] Build de producción compila limpiamente (`npm run build`).
- [ ] Verificación empírica con evidencia real documentada.
- [ ] Cero credenciales o secretos expuestos.
- [ ] Cambio aislado en su propia rama con PR preparado (sin commits directos a `main`).
- [ ] Cero sobreingeniería y principios de Honestidad Radical respetados.

---

## Registro de Enmiendas (Amendment Log)

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-11-06 | v1.0.0 | Ratificación inicial de la constitución. Integración formal de Honestidad Radical, Cero Sobreingeniería, Verificación Empírica y Protección de Despliegue. | Transición de borrador a v1.0.0 y establecimiento de la línea base innegociable de LYAXIS IA. |
