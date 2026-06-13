import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const PROVIDER = String(process.env.FDX_LLM_PROVIDER || (GEMINI_API_KEY ? 'gemini' : OPENAI_API_KEY ? 'openai' : 'gemini')).toLowerCase();
const MAX_INPUT_CHARS = 60000;
const ROOT_DIR = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DAILY_REQUEST_LIMIT = Math.max(0, Number.parseInt(process.env.FDX_DAILY_LIMIT || '5', 10) || 0);
const USAGE_FILE = resolve(process.env.FDX_USAGE_FILE || join(ROOT_DIR, 'output', 'text-fdx-usage.json'));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'author', 'notes', 'elements'],
  properties: {
    title: { type: 'string' },
    author: { type: 'string' },
    notes: { type: 'string' },
    elements: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'text'],
        properties: {
          type: {
            type: 'string',
            enum: ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition']
          },
          text: { type: 'string' }
        }
      }
    }
  }
};

function toGeminiSchema(value) {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (!value || typeof value !== 'object') return value;
  const next = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'additionalProperties') continue;
    next[key] = toGeminiSchema(nested);
  }
  return next;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_INPUT_CHARS + 10000) {
        req.destroy();
        reject(new Error('Request body is too large.'));
      }
    });
    req.on('end', () => resolveBody(body));
    req.on('error', reject);
  });
}

function extractOutputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}

function extractGeminiText(payload) {
  const chunks = [];
  for (const candidate of payload.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n');
}

function normalizeDocument(doc) {
  const source = doc && typeof doc === 'object' ? doc : {};
  const elements = Array.isArray(source.elements) ? source.elements : [];
  return {
    title: String(source.title || '').trim(),
    author: String(source.author || '').trim(),
    notes: String(source.notes || '').trim(),
    elements: elements
      .map((element) => ({
        type: String(element?.type || 'action').trim(),
        text: String(element?.text || '').trim()
      }))
      .filter((element) => element.text)
  };
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.FDX_LIMIT_TIMEZONE || 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

async function readUsage() {
  try {
    const parsed = JSON.parse(await readFile(USAGE_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

async function writeUsage(usage) {
  await mkdir(dirname(USAGE_FILE), { recursive: true });
  await writeFile(USAGE_FILE, JSON.stringify(usage, null, 2) + '\n', 'utf8');
}

async function getDailyUsage() {
  const day = todayKey();
  const usage = await readUsage();
  const count = Number.parseInt(usage[day]?.count || '0', 10) || 0;
  return {
    day,
    count,
    limit: DAILY_REQUEST_LIMIT,
    remaining: DAILY_REQUEST_LIMIT === 0 ? null : Math.max(0, DAILY_REQUEST_LIMIT - count)
  };
}

async function assertRequestAllowed() {
  const current = await getDailyUsage();
  if (current.limit > 0 && current.count >= current.limit) {
    const error = new Error(`Daily Text to FDX limit reached (${current.count}/${current.limit}).`);
    error.status = 429;
    error.usage = current;
    throw error;
  }
  return current;
}

async function recordRequestUsed() {
  const day = todayKey();
  const usage = await readUsage();
  const current = Number.parseInt(usage[day]?.count || '0', 10) || 0;
  usage[day] = {
    count: current + 1,
    updatedAt: new Date().toISOString()
  };
  await writeUsage(usage);
  return getDailyUsage();
}

async function formatFdx(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST.' });
    return;
  }
  const testBypass = process.env.FDX_TEST_BYPASS_MODEL === '1';
  if (!testBypass && PROVIDER === 'gemini' && !GEMINI_API_KEY) {
    sendJson(res, 500, { error: 'GEMINI_API_KEY is not set for the local proxy.' });
    return;
  }
  if (!testBypass && PROVIDER === 'openai' && !OPENAI_API_KEY) {
    sendJson(res, 500, { error: 'OPENAI_API_KEY is not set for the local proxy.' });
    return;
  }
  if (PROVIDER !== 'gemini' && PROVIDER !== 'openai') {
    sendJson(res, 500, { error: 'FDX_LLM_PROVIDER must be "gemini" or "openai".' });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (_) {
    sendJson(res, 400, { error: 'Request body must be JSON.' });
    return;
  }

  const text = String(body.text || '').trim();
  const titleHint = String(body.titleHint || '').trim();
  const authorHint = String(body.authorHint || '').trim();
  if (!text) {
    sendJson(res, 400, { error: 'Text is required.' });
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    sendJson(res, 400, { error: `Text must be under ${MAX_INPUT_CHARS.toLocaleString()} characters.` });
    return;
  }

  let usageBefore;
  try {
    usageBefore = await assertRequestAllowed();
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || 'Request limit check failed.',
      usage: error.usage || await getDailyUsage()
    });
    return;
  }

  if (testBypass) {
    const usage = await recordRequestUsed();
    sendJson(res, 200, {
      document: {
        title: titleHint,
        author: authorHint,
        notes: 'test bypass',
        elements: [{ type: 'action', text }]
      },
      model: 'test-bypass',
      provider: 'test',
      usage: usage || usageBefore
    });
    return;
  }

  const prompt = [
    'Format this raw draft into screenplay elements for Final Draft export.',
    'Preserve the writer\'s words as much as possible. Do not punch up, summarize, censor, or rewrite jokes.',
    'Infer only the screenplay block type: scene-heading, action, character, dialogue, parenthetical, transition.',
    'Use scene-heading for INT./EXT. headings and inferred sluglines.',
    'Use character for speaker cues only, and dialogue for lines spoken by that character.',
    'Use parenthetical only for short actor directions attached to dialogue.',
    'Use transition for CUT TO:, FADE OUT:, SMASH CUT TO:, and similar transitions.',
    'Uppercase scene headings, character cues, and transitions. Keep dialogue casing natural.',
    'If the title or author is not explicit, return an empty string. Do not invent Untitled, Unknown, or placeholder names.',
    'Leave notes empty unless there is a specific formatting uncertainty the user should review.',
    'Return only the structured document requested by the schema.'
  ].join('\n');

  const parsed = PROVIDER === 'gemini'
    ? await callGemini(prompt, text, titleHint, authorHint)
    : await callOpenAI(prompt, text, titleHint, authorHint);

  const document = normalizeDocument(parsed);
  if (!document.elements.length) {
    sendJson(res, 502, { error: 'Model returned no screenplay blocks.' });
    return;
  }
  const usage = await recordRequestUsed();
  sendJson(res, 200, {
    document,
    model: PROVIDER === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL,
    provider: PROVIDER,
    usage: usage || usageBefore
  });
}

async function callOpenAI(prompt, text, titleHint, authorHint) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            titleHint ? `Title hint: ${titleHint}` : 'Title hint: ',
            authorHint ? `Author hint: ${authorHint}` : 'Author hint: ',
            'Raw text:',
            text
          ].join('\n')
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'screenplay_format',
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || 'OpenAI request failed.');
  }

  try {
    return JSON.parse(extractOutputText(payload));
  } catch (_) {
    throw new Error('OpenAI returned unreadable structured output.');
  }
}

async function callGemini(prompt, text, titleHint, authorHint) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: prompt }]
      },
      contents: [{
        role: 'user',
        parts: [{
          text: [
            titleHint ? `Title hint: ${titleHint}` : 'Title hint: ',
            authorHint ? `Author hint: ${authorHint}` : 'Author hint: ',
            'Raw text:',
            text
          ].join('\n')
        }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(schema)
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Gemini request failed.');
  }

  try {
    return JSON.parse(extractGeminiText(payload));
  } catch (_) {
    throw new Error('Gemini returned unreadable structured output.');
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/favicon.ico') pathname = '/icon-192.svg';
  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(join(ROOT_DIR, normalizedPath));
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream'
    });
    res.end(data);
  } catch (_) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/api/health') {
    getDailyUsage().then((usage) => {
      sendJson(res, 200, {
        ok: true,
        provider: PROVIDER,
        model: PROVIDER === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL,
        keyConfigured: PROVIDER === 'gemini' ? !!GEMINI_API_KEY : !!OPENAI_API_KEY,
        usage
      });
    }).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Usage check failed.' });
    });
    return;
  }
  if (url.pathname === '/api/format-fdx') {
    formatFdx(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Formatter failed.' });
    });
    return;
  }
  serveStatic(req, res).catch((error) => {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(error.message || 'Server error');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Text to FDX proxy serving http://127.0.0.1:${PORT}/`);
  console.log(`Provider: ${PROVIDER}`);
  console.log(`Model: ${PROVIDER === 'gemini' ? GEMINI_MODEL : OPENAI_MODEL}`);
});
