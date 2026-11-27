const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');
const { shell } = require('electron');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const OAUTH_PORT = 38472;
const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/oauth2callback`;

class GoogleWorkspaceService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.credentialsPath = path.join(userDataPath, 'google-credentials.json');
    this.tokensPath = path.join(userDataPath, 'google-tokens.json');
    this.profilePath = path.join(userDataPath, 'google-profile.json');
    this.oauth2Client = null;
    this._initClient();
  }

  _readJson(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.error(`[GoogleWorkspace] Error reading ${filePath}:`, err.message);
    }
    return null;
  }

  _writeJson(filePath, obj) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  _initClient() {
    const creds = this._readJson(this.credentialsPath);
    if (!creds) {
      this.oauth2Client = null;
      return;
    }
    const cfg = creds.installed || creds.web;
    if (!cfg || !cfg.client_id || !cfg.client_secret) {
      this.oauth2Client = null;
      return;
    }
    this.oauth2Client = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, REDIRECT_URI);

    const tokens = this._readJson(this.tokensPath);
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
    }

    this.oauth2Client.on('tokens', (newTokens) => {
      const existing = this._readJson(this.tokensPath) || {};
      this._writeJson(this.tokensPath, { ...existing, ...newTokens });
    });
  }

  getStatus() {
    const hasCredentials = fs.existsSync(this.credentialsPath);
    const hasTokens = fs.existsSync(this.tokensPath);
    const profile = this._readJson(this.profilePath) || {};
    return {
      hasCredentials,
      isConnected: Boolean(hasCredentials && hasTokens && this.oauth2Client),
      userEmail: profile.email || '',
      userName: profile.name || '',
      redirectUri: REDIRECT_URI,
    };
  }

  saveCredentials(jsonText) {
    let parsed;
    try {
      parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    } catch {
      throw new Error('El archivo no es un JSON válido.');
    }
    const cfg = parsed.installed || parsed.web;
    if (!cfg || !cfg.client_id || !cfg.client_secret) {
      throw new Error('El JSON debe ser un archivo de credenciales OAuth 2.0 de Google Cloud (Desktop App).');
    }
    this._writeJson(this.credentialsPath, parsed);
    this._initClient();
    return this.getStatus();
  }

  async connect() {
    if (!this.oauth2Client) {
      this._initClient();
    }
    if (!this.oauth2Client) {
      throw new Error('Primero debes cargar tu archivo credentials.json de Google Cloud.');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });

    const code = await new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        try {
          const parsedUrl = new URL(req.url, `http://127.0.0.1:${OAUTH_PORT}`);
          if (parsedUrl.pathname !== '/oauth2callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const authCode = parsedUrl.searchParams.get('code');
          const errParam = parsedUrl.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          if (errParam) {
            res.end(
              `<body style="background:#050a14;color:#ff6b6b;font-family:sans-serif;text-align:center;padding:60px;">
                <h2>Autorización cancelada</h2>
                <p>Error: ${errParam}. Puedes cerrar esta pestaña.</p>
              </body>`
            );
            server.close();
            reject(new Error(`Google OAuth error: ${errParam}`));
            return;
          }

          res.end(
            `<body style="background:#050a14;color:#00e5ff;font-family:sans-serif;text-align:center;padding:60px;">
              <h1>J.A.R.V.I.S. Conectado</h1>
              <p style="color:#d0e8ff;">Tu cuenta de Google Workspace ha sido vinculada con éxito. Puedes cerrar esta pestaña y volver a J.A.R.V.I.S.</p>
            </body>`
          );
          server.close();
          resolve(authCode);
        } catch (err) {
          server.close();
          reject(err);
        }
      });

      server.on('error', (err) => {
        reject(new Error(`No se pudo iniciar el servidor local OAuth en el puerto ${OAUTH_PORT}: ${err.message}`));
      });

      server.listen(OAUTH_PORT, '127.0.0.1', () => {
        shell.openExternal(authUrl);
      });

      setTimeout(() => {
        try {
          server.close();
        } catch {}
        reject(new Error('Tiempo de espera agotado para la autenticación con Google (3 minutos).'));
      }, 180000);
    });

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this._writeJson(this.tokensPath, tokens);

    // Fetch user info
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      this._writeJson(this.profilePath, {
        email: data.email || '',
        name: data.name || '',
        picture: data.picture || '',
      });
    } catch (err) {
      console.warn('[GoogleWorkspace] Could not fetch userinfo:', err.message);
    }

    return this.getStatus();
  }

  disconnect() {
    if (fs.existsSync(this.tokensPath)) fs.unlinkSync(this.tokensPath);
    if (fs.existsSync(this.profilePath)) fs.unlinkSync(this.profilePath);
    this._initClient();
    return this.getStatus();
  }

  _requireAuth() {
    const status = this.getStatus();
    if (!status.isConnected || !this.oauth2Client) {
      throw new Error('Google Workspace no está conectado. Ve a Configuración para vincular tu cuenta.');
    }
    return this.oauth2Client;
  }

  // ===================== GMAIL =====================
  async gmailListMessages({ query = '', maxResults = 15 } = {}) {
    const auth = this._requireAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query || undefined,
      maxResults: Math.min(Number(maxResults) || 15, 30),
    });

    const messages = listRes.data.messages || [];
    const detailed = await Promise.all(
      messages.map(async (m) => {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: m.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });
        const headers = msgRes.data.payload?.headers || [];
        const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        return {
          id: m.id,
          threadId: m.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject') || '(Sin asunto)',
          date: getHeader('Date'),
          snippet: msgRes.data.snippet || '',
          unread: (msgRes.data.labelIds || []).includes('UNREAD'),
        };
      })
    );
    return detailed;
  }

  async gmailReadMessage(id) {
    const auth = this._requireAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const headers = res.data.payload?.headers || [];
    const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const extractBody = (payload) => {
      if (!payload) return '';
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
      }
      if (Array.isArray(payload.parts)) {
        const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
        if (plain) return extractBody(plain);
        const html = payload.parts.find((p) => p.mimeType === 'text/html');
        if (html) {
          return extractBody(html)
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        for (const p of payload.parts) {
          const text = extractBody(p);
          if (text) return text;
        }
      }
      return '';
    };

    const body = extractBody(res.data.payload) || res.data.snippet || '';
    return {
      id: res.data.id,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject') || '(Sin asunto)',
      date: getHeader('Date'),
      body: body.slice(0, 8000),
    };
  }

  async gmailSendEmail({ to, subject, body }) {
    const auth = this._requireAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || '(Sin asunto)', 'utf-8').toString('base64')}?=`;
    const rawMessage = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body || '',
    ].join('\r\n');

    const encoded = Buffer.from(rawMessage, 'utf-8').toString('base64url');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });
    return { id: res.data.id, status: 'sent', to, subject };
  }

  // ===================== CALENDAR =====================
  async calendarListEvents({ maxResults = 15, timeMin } = {}) {
    const auth = this._requireAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      maxResults: Math.min(Number(maxResults) || 15, 30),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary || '(Sin título)',
      description: ev.description || '',
      location: ev.location || '',
      start: ev.start?.dateTime || ev.start?.date || '',
      end: ev.end?.dateTime || ev.end?.date || '',
      htmlLink: ev.htmlLink || '',
    }));
  }

  async calendarCreateEvent({ summary, description = '', start, end, location = '' }) {
    const auth = this._requireAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });
    return {
      id: res.data.id,
      summary: res.data.summary,
      start: res.data.start?.dateTime,
      end: res.data.end?.dateTime,
      htmlLink: res.data.htmlLink,
    };
  }

  // ===================== DRIVE =====================
  async driveSearchFiles({ query = '', pageSize = 20 } = {}) {
    const auth = this._requireAuth();
    const drive = google.drive({ version: 'v3', auth });
    const qParts = ['trashed = false'];
    if (query && query.trim()) {
      const safe = query.trim().replace(/'/g, "\\'");
      qParts.push(`name contains '${safe}'`);
    }
    const res = await drive.files.list({
      q: qParts.join(' and '),
      pageSize: Math.min(Number(pageSize) || 20, 40),
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size)',
    });
    return res.data.files || [];
  }

  // ===================== DOCS =====================
  async docsReadDocument(documentId) {
    const auth = this._requireAuth();
    const docs = google.docs({ version: 'v1', auth });
    const res = await docs.documents.get({ documentId });
    const content = res.data.body?.content || [];
    let text = '';
    for (const elem of content) {
      if (elem.paragraph?.elements) {
        for (const pe of elem.paragraph.elements) {
          if (pe.textRun?.content) text += pe.textRun.content;
        }
      }
    }
    return {
      documentId: res.data.documentId,
      title: res.data.title,
      text: text.slice(0, 10000),
    };
  }

  async docsCreateDocument({ title, content = '' }) {
    const auth = this._requireAuth();
    const docs = google.docs({ version: 'v1', auth });
    const created = await docs.documents.create({
      requestBody: { title: title || 'Documento de J.A.R.V.I.S.' },
    });
    const documentId = created.data.documentId;
    if (content && content.trim()) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{ insertText: { location: { index: 1 }, text: content } }],
        },
      });
    }
    return {
      documentId,
      title: created.data.title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  }

  // ===================== SHEETS =====================
  async sheetsReadRange({ spreadsheetId, range = 'A1:H25' }) {
    const auth = this._requireAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return {
      spreadsheetId,
      range: res.data.range,
      values: res.data.values || [],
    };
  }

  async sheetsAppendRow({ spreadsheetId, range = 'A1', values = [] }) {
    const auth = this._requireAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
    return {
      spreadsheetId,
      updatedRange: res.data.updates?.updatedRange,
    };
  }
}

module.exports = { GoogleWorkspaceService };
