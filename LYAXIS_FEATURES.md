# 🌌 LYAXIS IA - Manual de Funciones y Arquitectura

LYAXIS IA es una plataforma de Inteligencia Artificial multicapa, diseñada bajo una filosofía estética "Cyber-Premium" (*Create. Break. Rebuild.*) y construida con una arquitectura técnica moderna orientada al rendimiento y la inmersión del usuario.

A continuación, se detalla todo lo que compone y es capaz de hacer LYAXIS IA en su estado actual:

---

## 🎨 1. Experiencia de Usuario y Estética (UI/UX)
El frontend no es solo una interfaz de chat genérica, está diseñado para sentirse como una terminal futurista de alto nivel:

- **Auras Ambientales Dinámicas:** El fondo de la aplicación reacciona al modelo que selecciones. Si eliges *Cortex*, el ambiente brilla con un tono púrpura suave. Si eliges *Forge*, cambia a un tono naranja industrial, creando una experiencia inmersiva.
- **Barra de Acción de Cristal (Glassmorphism):** Un menú flotante translúcido y elegante que aparece al pasar el ratón (*hover*) sobre los mensajes de la IA, manteniendo la interfaz limpia mientras lees.
- **Bloques de Código "MacOS Premium":** Cuando la IA escribe código, este se presenta en una ventana estilizada con los tres clásicos botones de ventana de Mac, resaltado de sintaxis moderno y un botón de copiado integrado.
- **Lectura Estilo Documento (Pro-Flow):** Tanto tus mensajes como los de la IA están alineados a la izquierda para formar un hilo de lectura continuo y profesional (similar a Claude o Notion).
- **Diseño Responsivo:** Funciona perfectamente tanto en escritorio como en dispositivos móviles (con menú lateral deslizable).
- **HUD de Telemetría:** Un panel (dashboard) visual de telemetría que simula métricas en tiempo real de la plataforma.
- **Diseño Sonoro Integrado:** Efectos de sonido cibernéticos sutiles (que se pueden silenciar) al enviar mensajes, recibir respuestas (efecto *typing*) o abrir paneles.

---

## 🧠 2. Personas e Inteligencia (Modelos Especializados)
En lugar de tener una IA genérica que lo haga todo a medias, LYAXIS divide su "cerebro" (impulsado por la arquitectura **LYAXIS Neural Engine**) en entidades especializadas. Cada modelo cuenta con "Límites de Dominio" (*Boundaries*): si le pides a uno que haga el trabajo de otro, se negará educadamente y te dirá a qué modelo debes acudir.

1. **⚡ Speed (Cyan):** 
   - *Rol:* Asistente ultrarrápido y directo. 
   - *Uso:* Respuestas concisas, sin relleno. Ideal para dudas rápidas.
2. **🧠 Cortex (Púrpura):** 
   - *Rol:* Analista profundo y pensador complejo.
   - *Uso:* Resolución de problemas matemáticos, lógicos, rompecabezas o análisis de datos.
3. **🏗️ Architect (Verde Esmeralda):** 
   - *Rol:* Ingeniero de software experto.
   - *Uso:* Arquitectura de sistemas, escritura de código complejo, bases de datos y buenas prácticas.
4. **💬 Classic (Dorado):** 
   - *Rol:* Asistente general amigable.
   - *Uso:* Tareas cotidianas, redacción de correos, resúmenes, traducción y charla habitual.
5. **👻 Phantom (Rojo Carmesí):** 
   - *Rol:* Entidad críptica enfocada en seguridad.
   - *Uso:* Auditoría de código, ciberseguridad, vulnerabilidades y respuestas con filosofía "hacker".
6. **🌌 Nexus (Magenta):** 
   - *Rol:* Pensador interdisciplinario.
   - *Uso:* Relaciona conceptos aparentemente desconectados (ej. biología con arquitectura de software) para dar respuestas innovadoras.
7. **🛠️ Forge (Naranja Industrial):** 
   - *Rol:* Constructor pragmático.
   - *Uso:* Convierte ideas vagas ("quiero hacer una app de postres") en planes estructurados, modelos de negocio o MVP (Mínimo Producto Viable).
8. **🎓 Magister (Teal/Cian Pedagógico):** 
   - *Rol:* Copiloto pedagógico y especialista en planeación docente.
   - *Uso:* Diseña planeaciones didácticas SEP, proyectos de la Nueva Escuela Mexicana (NEM), secuencias didácticas por momentos, rúbricas de evaluación formativa y ajustes razonables para Preescolar, Primaria, Secundaria y Preparatoria.
9. **🎨 Canvas (Violeta Eléctrico):** 
   - *Rol:* Diseñador visual de presentaciones y Slide Decks.
   - *Uso:* Transforma temas complejos en láminas e infografías interactivas 16:9 estilo Canva, con visor de diapositivas en vivo (navegación ◀ ▶, modo pantalla completa, notas del orador y exportación descargable a PDF).
10. **🔓 Root (Verde Neón Cyber #00FF66):** 
    - *Rol:* Motor de ejecución técnica absoluta, desarrollo integral y código sin filtros.
    - *Uso:* Creación de interfaces completas (UI/UX) en React/CSS, desarrollo full-stack (FastAPI, Node, SQL), bajo nivel (C, C++, Assembly), ingeniería inversa, PoCs de vulnerabilidades, memoria, kernel y scripts sin restricciones morales, sin placeholders y sin negativas a responder.

---

## ⚙️ 3. Arquitectura Técnica y Backend
El sistema está construido para ser escalable, rápido y seguro:

- **Autenticación con Google (OAuth 2.0):** Los usuarios pueden iniciar sesión con un solo clic usando su cuenta de Google.
- **Persistencia en Tiempo Real:** 
  - Todo lo que escribes se guarda automáticamente en una base de datos **PostgreSQL** alojada en **Supabase** (con respaldo local SQLite).
  - No hay botón de "Guardar chat". Si cierras la ventana y vuelves a entrar, tu conversación seguirá ahí.
- **Motor de Streaming (SSE):** Las respuestas de la IA se transmiten palabra por palabra (Server-Sent Events) directo al cliente, evitando largos tiempos de espera.
- **Despliegue Continuo (CI/CD):** 
  - *Frontend:* React + Vite + TypeScript alojado en **Vercel**.
  - *Backend:* Python + FastAPI alojado en **Render**, con enrutamiento dinámico y protección CORS.
- **Actualización Dinámica de Modelos:** El servidor implementa la arquitectura **LYAXIS Neural Engine**, optimizada para streaming asíncrono con latencias menores a 0.5s y cascada automática de redundancia entre modelos de alta velocidad.

---

## 🚀 4. Flujo y Reglas de la IA (System Prompts)
Los prompts de LYAXIS están diseñados meticulosamente con reglas estrictas:
1. **Identidad:** Siempre saben quiénes son y actúan de acuerdo a su color y personalidad.
2. **Exclusividad:** Respetan profundamente sus funciones. (Ej. Architect no escribirá poemas, te mandará a Classic).
3. **Formato:** Entregan respuestas limpias en formato Markdown, con un uso inteligente de negritas e íconos.

> *"La perfección no se alcanza cuando no hay nada más que añadir, sino cuando no hay nada más que quitar."* — LYAXIS IA
