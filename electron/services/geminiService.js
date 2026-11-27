const { GoogleGenAI, Type } = require('@google/genai');

const FUNCTION_DECLARATIONS = [
  {
    name: 'list_tasks',
    description: 'Lista las tareas pendientes, en progreso o completadas del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Filtrar por estado: pendiente, en_progreso, completada o todas',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Crea una nueva tarea pendiente en el gestor de J.A.R.V.I.S.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título claro de la tarea' },
        description: { type: Type.STRING, description: 'Descripción o detalles adicionales' },
        priority: { type: Type.STRING, description: 'Prioridad: alta, media o baja' },
        dueDate: { type: Type.STRING, description: 'Fecha límite en formato YYYY-MM-DD (opcional)' },
        projectId: { type: Type.STRING, description: 'ID del proyecto asociado (opcional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Actualiza el estado, prioridad, título o fecha de una tarea existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID de la tarea' },
        title: { type: Type.STRING },
        status: { type: Type.STRING, description: 'pendiente, en_progreso o completada' },
        priority: { type: Type.STRING, description: 'alta, media o baja' },
        dueDate: { type: Type.STRING },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Elimina una tarea por su ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID de la tarea a eliminar' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_projects',
    description: 'Obtiene todos los proyectos del usuario con su porcentaje de avance y sus hitos.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'create_project',
    description: 'Crea un nuevo proyecto con hitos iniciales opcionales.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre del proyecto' },
        description: { type: Type.STRING, description: 'Descripción breve del proyecto' },
        priority: { type: Type.STRING, description: 'Prioridad del proyecto: alta, media o baja' },
        deadline: { type: Type.STRING, description: 'Fecha objetivo YYYY-MM-DD' },
        milestones: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de hitos/entregables iniciales',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'toggle_project_milestone',
    description: 'Marca o desmarca un hito de un proyecto y recalcula automáticamente su porcentaje de avance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING },
        milestoneId: { type: Type.STRING },
      },
      required: ['projectId', 'milestoneId'],
    },
  },
  {
    name: 'gmail_list_messages',
    description: 'Lista o busca correos en Gmail del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Consulta de búsqueda de Gmail (ej. is:unread, from:alguien)' },
        maxResults: { type: Type.NUMBER, description: 'Cantidad máxima de correos (por defecto 8)' },
      },
    },
  },
  {
    name: 'gmail_read_message',
    description: 'Lee el contenido completo de un correo de Gmail usando su ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID del mensaje de Gmail' },
      },
      required: ['id'],
    },
  },
  {
    name: 'gmail_send_email',
    description: 'Envía un correo electrónico desde la cuenta de Gmail del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: 'Dirección de correo destinatario' },
        subject: { type: Type.STRING, description: 'Asunto del correo' },
        body: { type: Type.STRING, description: 'Cuerpo del mensaje en texto plano' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'calendar_list_events',
    description: 'Lista los próximos eventos de Google Calendar del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        maxResults: { type: Type.NUMBER, description: 'Número máximo de eventos (por defecto 10)' },
      },
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Agenda un nuevo evento en Google Calendar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: 'Título del evento' },
        description: { type: Type.STRING },
        start: { type: Type.STRING, description: 'Fecha y hora de inicio en formato ISO 8601' },
        end: { type: Type.STRING, description: 'Fecha y hora de fin en formato ISO 8601 (opcional)' },
        location: { type: Type.STRING },
      },
      required: ['summary', 'start'],
    },
  },
  {
    name: 'drive_search_files',
    description: 'Busca archivos en Google Drive del usuario (Docs, Sheets, PDFs, carpetas).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Texto a buscar en el nombre del archivo' },
        pageSize: { type: Type.NUMBER },
      },
    },
  },
  {
    name: 'docs_read_document',
    description: 'Lee el contenido de texto de un Google Doc usando su ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: { type: Type.STRING },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'docs_create_document',
    description: 'Crea un nuevo Google Doc con título y contenido opcional.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
      },
      required: ['title'],
    },
  },
  {
    name: 'sheets_read_range',
    description: 'Lee celdas de una hoja de cálculo de Google Sheets.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spreadsheetId: { type: Type.STRING },
        range: { type: Type.STRING, description: 'Rango A1, por ejemplo A1:F20' },
      },
      required: ['spreadsheetId'],
    },
  },
];

class GeminiService {
  constructor(store, googleWorkspace) {
    this.store = store;
    this.googleWorkspace = googleWorkspace;
  }

  async _executeTool(name, args = {}) {
    try {
      switch (name) {
        case 'list_tasks':
          return this.store.getTasks({ status: args.status });
        case 'create_task':
          return this.store.createTask(args);
        case 'update_task':
          return this.store.updateTask(args.id, args);
        case 'delete_task':
          return { deleted: this.store.deleteTask(args.id) };
        case 'list_projects':
          return this.store.getProjects();
        case 'create_project':
          return this.store.createProject(args);
        case 'toggle_project_milestone':
          return this.store.toggleMilestone(args.projectId, args.milestoneId);
        case 'gmail_list_messages':
          return await this.googleWorkspace.gmailListMessages(args);
        case 'gmail_read_message':
          return await this.googleWorkspace.gmailReadMessage(args.id);
        case 'gmail_send_email':
          return await this.googleWorkspace.gmailSendEmail(args);
        case 'calendar_list_events':
          return await this.googleWorkspace.calendarListEvents(args);
        case 'calendar_create_event':
          return await this.googleWorkspace.calendarCreateEvent(args);
        case 'drive_search_files':
          return await this.googleWorkspace.driveSearchFiles(args);
        case 'docs_read_document':
          return await this.googleWorkspace.docsReadDocument(args.documentId);
        case 'docs_create_document':
          return await this.googleWorkspace.docsCreateDocument(args);
        case 'sheets_read_range':
          return await this.googleWorkspace.sheetsReadRange(args);
        default:
          return { error: `Herramienta desconocida: ${name}` };
      }
    } catch (err) {
      return { error: err.message || String(err) };
    }
  }

  async _localFallback(userMessage) {
    const lower = userMessage.toLowerCase().trim();
    const toolsUsed = [];

    if (/^(crea|agrega|añade|nueva)\s+tarea\s*:?\s*(.+)/i.test(userMessage)) {
      const match = userMessage.match(/^(?:crea|agrega|añade|nueva)\s+tarea\s*:?\s*(.+)/i);
      const title = match[1].trim();
      const task = this.store.createTask({ title, priority: 'media' });
      toolsUsed.push('create_task');
      return {
        text: `Entendido. He registrado la tarea **"${task.title}"** en su lista de pendientes.\n\n*(Nota: Para conversaciones inteligentes completas con voz y gestión avanzada, agregue su clave gratuita de Gemini API en la pestaña **Configuración**).*`,
        toolsUsed,
      };
    }

    if (lower.includes('tareas') || lower.includes('pendientes')) {
      const tasks = this.store.getTasks({ status: 'pendiente' });
      toolsUsed.push('list_tasks');
      if (tasks.length === 0) {
        return { text: 'No tiene tareas pendientes registradas en este momento.', toolsUsed };
      }
      const list = tasks.map((t, i) => `${i + 1}. **${t.title}** _(Prioridad: ${t.priority})_`).join('\n');
      return { text: `Sus tareas pendientes actuales:\n\n${list}`, toolsUsed };
    }

    if (lower.includes('proyecto')) {
      const projects = this.store.getProjects();
      toolsUsed.push('list_projects');
      if (projects.length === 0) {
        return { text: 'Aún no tiene proyectos registrados.', toolsUsed };
      }
      const list = projects.map((p) => `- **${p.name}**: ${p.progress}% completado (${p.status})`).join('\n');
      return { text: `Estado actual de sus proyectos:\n\n${list}`, toolsUsed };
    }

    return {
      text: `Estoy operando en **modo local básico** porque aún no ha configurado su clave de **Gemini API**.\n\nMientras tanto puede:\n- Escribir \`crea tarea: Revisar informe\` o \`mis tareas\` o \`mis proyectos\`\n- Usar directamente las pestañas de **Tareas**, **Proyectos** y **Google Workspace**\n- Ir a **Configuración** y pegar su clave gratuita de Google AI Studio para activar toda mi inteligencia artificial.`,
      toolsUsed,
    };
  }

  async _generateWithRetry(ai, primaryModel, params) {
    const fallbackOrder = [
      primaryModel,
      primaryModel === 'gemini-3.8-flash' ? 'gemini-3.8-flash-lite' : 'gemini-3.8-flash',
      'gemini-3.8-pro',
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    let lastErr;
    for (const modelName of fallbackOrder) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await ai.models.generateContent({ ...params, model: modelName });
        } catch (err) {
          lastErr = err;
          const msg = String(err?.message || err);
          const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('429');
          if (isTransient && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1400));
            continue;
          }
          if (isTransient || msg.includes('404') || msg.includes('NOT_FOUND')) {
            break; // try next fallback model
          }
          throw err;
        }
      }
    }
    throw lastErr;
  }

  async chat(userMessage) {
    const settings = this.store.getSettings();
    const apiKey = (settings.geminiApiKey || '').trim();

    this.store.appendChatMessage({ role: 'user', text: userMessage });

    if (!apiKey) {
      const fallback = await this._localFallback(userMessage);
      const assistantMsg = this.store.appendChatMessage({
        role: 'assistant',
        text: fallback.text,
        toolsUsed: fallback.toolsUsed,
      });
      return { message: assistantMsg, dataChanged: fallback.toolsUsed.length > 0 };
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = settings.geminiModel || 'gemini-3.8-flash';
    const wsStatus = this.googleWorkspace.getStatus();
    const nowStr = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });

    const systemInstruction = `Eres J.A.R.V.I.S. (Just A Rather Very Intelligent System), el asistente virtual personal de escritorio de ${settings.userName || 'Señor'}, inspirado en Iron Man.
Hablas en español con un tono cortés, ágil, elegante, preciso y resolutivo. Mantén tus respuestas claras, concisas y bien estructuradas.
Fecha y hora actual: ${nowStr}.
Estado de Google Workspace: ${wsStatus.isConnected ? `Conectado como ${wsStatus.userEmail}` : 'No conectado aún (si el usuario pide algo de Gmail/Calendar/Drive, indícale amablemente que conecte su cuenta en Configuración)'}.
Tienes herramientas reales para gestionar Tareas, Proyectos, Gmail, Google Calendar, Google Drive, Google Docs y Google Sheets. Úsalas proactivamente cuando el usuario pida consultar, crear, actualizar o enviar información. Antes de enviar un correo real, si faltan datos (destinatario o mensaje), pregunta primero.`;

    const recentHistory = this.store.getChatHistory().slice(-14);
    const contents = recentHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const toolsUsed = [];
    let finalText = '';

    try {
      for (let turn = 0; turn < 5; turn++) {
        const response = await this._generateWithRetry(ai, model, {
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          },
        });

        const calls = response.functionCalls;
        if (calls && calls.length > 0) {
          const modelContent = response.candidates?.[0]?.content;
          if (modelContent) {
            contents.push(modelContent);
          }

          const functionResponses = [];
          for (const call of calls) {
            toolsUsed.push(call.name);
            const result = await this._executeTool(call.name, call.args || {});
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result },
              },
            });
          }

          contents.push({
            role: 'user',
            parts: functionResponses,
          });
        } else {
          finalText = response.text || 'Operación completada, Señor.';
          break;
        }
      }
    } catch (err) {
      console.error('[GeminiService] Error:', err);
      finalText = `He detectado una anomalía al comunicarme con el núcleo de Gemini: **${err.message || err}**.\n\nPor favor verifique su clave API o el modelo seleccionado en **Configuración**.`;
    }

    const assistantMsg = this.store.appendChatMessage({
      role: 'assistant',
      text: finalText || 'A sus órdenes.',
      toolsUsed: [...new Set(toolsUsed)],
    });

    return {
      message: assistantMsg,
      dataChanged: toolsUsed.some((t) =>
        ['create_task', 'update_task', 'delete_task', 'create_project', 'toggle_project_milestone'].includes(t)
      ),
    };
  }

  async testConnection(apiKey, model = 'gemini-3.8-flash') {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('Ingresa una clave de API de Gemini.');
    }
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const res = await this._generateWithRetry(ai, model, {
      contents: 'Responde solo con: "Núcleo J.A.R.V.I.S. en línea."',
    });
    return { ok: true, reply: res.text || 'Núcleo J.A.R.V.I.S. en línea.' };
  }
}

module.exports = { GeminiService };
