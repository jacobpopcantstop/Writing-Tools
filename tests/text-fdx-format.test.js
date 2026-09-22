const { test } = require('node:test');
const assert = require('node:assert');
const TextFDX = require('../text-fdx-format.js');
const Screenplay = require('../courius-format.js');

test('validateInputText rejects empty and oversized input', () => {
  assert.strictEqual(TextFDX.validateInputText('   ').ok, false);
  const oversized = 'x'.repeat(TextFDX.MAX_INPUT_CHARS + 1);
  const result = TextFDX.validateInputText(oversized);
  assert.strictEqual(result.ok, false);
  assert.match(result.message, /too long/i);
});

test('normalizeFormatterResult coerces types and drops empty blocks', () => {
  const normalized = TextFDX.normalizeFormatterResult({
    title: '  Test  ',
    author: ' A ',
    notes: ' ok ',
    elements: [
      { type: 'Scene Heading', text: ' INT. ROOM - DAY ' },
      { type: 'dialog', text: 'Hi.' },
      { type: 'weird', text: 'Action line.' },
      { type: 'character', text: '   ' }
    ]
  });
  assert.deepStrictEqual(normalized, {
    title: 'Test',
    author: 'A',
    notes: 'ok',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'dialogue', text: 'Hi.' },
      { type: 'action', text: 'Action line.' }
    ]
  });
});

test('normalizeFormatterResult drops generic model placeholders', () => {
  const normalized = TextFDX.normalizeFormatterResult({
    title: 'Untitled',
    author: 'Unknown',
    notes: 'Screenplay draft conversion',
    elements: [{ type: 'action', text: 'A useful line.' }]
  });
  assert.strictEqual(normalized.title, '');
  assert.strictEqual(normalized.author, '');
  assert.strictEqual(normalized.notes, '');
  assert.deepStrictEqual(normalized.elements, [{ type: 'action', text: 'A useful line.' }]);
});

test('parseStructuredJson accepts fenced JSON from chat tools', () => {
  const parsed = TextFDX.parseStructuredJson('```json\n{"title":"T","author":"","notes":"","elements":[{"type":"scene heading","text":"INT. ROOM - DAY"}]}\n```');
  assert.deepStrictEqual(parsed, {
    title: 'T',
    author: '',
    notes: '',
    elements: [{ type: 'scene-heading', text: 'INT. ROOM - DAY' }]
  });
});

test('buildManualPrompt includes schema and source text', () => {
  const prompt = TextFDX.buildManualPrompt('Dad enters.', 'Pilot', 'Jacob');
  assert.match(prompt, /Return only JSON/);
  assert.match(prompt, /"elements"/);
  assert.match(prompt, /Title hint: Pilot/);
  assert.match(prompt, /Author hint: Jacob/);
  assert.match(prompt, /Dad enters\./);
});

test('buildFdx delegates normalized blocks to Courius FDX writer', () => {
  const fdx = TextFDX.buildFdx({
    title: 'My <Script>',
    author: 'A & B',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'character', text: 'DAD' },
      { type: 'dialogue', text: 'This exports.' }
    ]
  }, Screenplay);
  assert.ok(fdx.includes('<Title>My &lt;Script&gt;</Title>'));
  assert.ok(fdx.includes('<Author>A &amp; B</Author>'));
  assert.ok(fdx.includes('<Paragraph Type="Scene Heading"><Text>INT. ROOM - DAY</Text></Paragraph>'));
  assert.ok(fdx.includes('<Paragraph Type="Character"><Text>DAD</Text></Paragraph>'));
  assert.ok(fdx.includes('<Paragraph Type="Dialogue"><Text>This exports.</Text></Paragraph>'));
});

test('buildCouriusHtml creates editor-compatible blocks and escapes text', () => {
  const html = TextFDX.buildCouriusHtml({
    title: 'T < 1',
    author: 'A & B',
    elements: [
      { type: 'character', text: 'DAD' },
      { type: 'dialogue', text: 'One <two>\nThree' }
    ]
  });
  assert.ok(html.includes('class="title-page-container"'));
  assert.ok(html.includes('T &lt; 1'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('<div class="character">DAD</div>'));
  assert.ok(html.includes('<div class="dialogue">One &lt;two&gt;<br>Three</div>'));
});

function memoryStorage(entries) {
  const values = new Map(entries || []);
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test('saveToCourius adds a new script without touching the open one', () => {
  const Courius = require('../shared-courius.js');
  const storage = memoryStorage([
    ['writingtools_courius_storage', '<div class="action">Existing work.</div>'],
    ['writingtools_courius_docs_v1', JSON.stringify([{ id: 'doc_old', name: 'Old', auto: false, updatedAt: 1 }])],
    ['writingtools_courius_active_doc_v1', 'doc_old']
  ]);
  const html = TextFDX.saveToCourius({
    title: 'Pilot',
    elements: [{ type: 'action', text: 'A clean handoff.' }]
  }, storage, Courius);
  const values = storage.values;
  assert.ok(html.includes('A clean handoff.'));
  assert.strictEqual(values.get('writingtools_courius_storage'), '<div class="action">Existing work.</div>');
  const docs = JSON.parse(values.get('writingtools_courius_docs_v1'));
  assert.strictEqual(docs.length, 2);
  assert.strictEqual(docs[0].name, 'Pilot');
  assert.ok(values.get('writingtools_courius_doc_' + docs[0].id).includes('A clean handoff.'));
  assert.strictEqual(JSON.parse(values.get('writingtools_courius_open_request_v1')).id, docs[0].id);
});

test('createScript registers the legacy buffer when Courius has no script index yet', () => {
  const Courius = require('../shared-courius.js');
  const storage = memoryStorage([['writingtools_courius_storage', '<div class="action">Legacy.</div>']]);
  const id = Courius.createScript('<div class="action">New.</div>', 'BeatHive', '', storage);
  const values = storage.values;
  const docs = JSON.parse(values.get('writingtools_courius_docs_v1'));
  assert.strictEqual(docs.length, 2);
  assert.strictEqual(docs[0].id, id);
  assert.strictEqual(docs[0].name, 'From BeatHive');
  assert.strictEqual(values.get('writingtools_courius_active_doc_v1'), docs[1].id);
  assert.strictEqual(values.get('writingtools_courius_storage'), '<div class="action">Legacy.</div>');
});

test('parseStructuredJson accepts prose-wrapped LLM replies', () => {
  const reply = 'Sure! Here is the formatted screenplay:\n```json\n{"title":"T","author":"","notes":"","elements":[{"type":"action","text":"Dad enters."}]}\n```\nLet me know if you need anything else.';
  const parsed = TextFDX.parseStructuredJson(reply);
  assert.deepStrictEqual(parsed.elements, [{ type: 'action', text: 'Dad enters.' }]);
});

test('parseStructuredJson throws a friendly error on garbage input', () => {
  assert.throws(() => TextFDX.parseStructuredJson('no json here'), /valid JSON/i);
  assert.throws(() => TextFDX.parseStructuredJson('   '), /paste the json/i);
});
