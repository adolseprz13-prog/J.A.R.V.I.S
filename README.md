# J.A.R.V.I.S. — Asistente Virtual de Escritorio (Iron Man HUD)

Asistente virtual interactivo para Windows con icono flotante animado de **Iron Man**, panel HUD estilo Stark Industries, chat + comandos de voz, gestor de tareas, seguimiento de proyectos e integración completa con **Google Workspace** (Gmail, Calendar, Drive, Docs y Sheets).

## Cómo iniciarlo
- **Opción rápida:** Haz doble clic en `Iniciar-JARVIS.bat` en esta carpeta.
- **Desde terminal:**
  ```powershell
  npm.cmd start
  ```

## Funciones incluidas
1. **Icono flotante de Iron Man + Bandeja del sistema:**
   - **Clic izquierdo** en el icono de Iron Man: abre o cierra el panel HUD.
   - **Arrastrar**: muévelo a cualquier esquina de tu pantalla.
   - **Clic derecho**: menú rápido (Abrir Panel, Hablar con J.A.R.V.I.S., Ocultar, Salir).
   - **Atajo global:** `Ctrl + Shift + J` desde cualquier aplicación.
2. **J.A.R.V.I.S. Chat y Voz (Google Gemini API):**
   - Conversa por texto o presionando el botón del micrófono.
   - J.A.R.V.I.S. puede crear/editar tareas, consultar proyectos, leer/enviar correos de Gmail, agendar eventos en Calendar y buscar/leer documentos en Drive, Docs y Sheets.
3. **Tareas Pendientes y Proyectos:**
   - Control total de prioridades, fechas límite, estados y proyectos con barra de progreso automática según hitos completados.
4. **Google Workspace Completo:**
   - **Gmail:** buscar, leer y enviar correos.
   - **Calendar:** ver agenda y crear eventos.
   - **Drive, Docs & Sheets:** buscar archivos, previsualizar documentos y hojas de cálculo, y abrirlos en el navegador.

## Configuración inicial recomendada
1. Abre la pestaña **Configuración** dentro de J.A.R.V.I.S.
2. **Gemini API:** Obtén tu clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey), pégala y haz clic en **Probar Conexión Gemini**.
3. **Google Workspace:** Sigue los 4 pasos integrados en **Configuración** para descargar tu `credentials.json` de Google Cloud Console, cárgalo y haz clic en **Conectar con Google Workspace**.
