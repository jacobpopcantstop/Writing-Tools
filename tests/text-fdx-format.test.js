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

test('saveToCourius writes storage, revision, and timestamp', () => {
  const values = new Map([['writingtools_courius_revision_v1', '3']]);
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const html = TextFDX.saveToCourius({
    elements: [{ type: 'action', text: 'A clean handoff.' }]
  }, storage);
  assert.ok(html.includes('A clean handoff.'));
  assert.strictEqual(values.get('writingtools_courius_storage'), html);
  assert.strictEqual(values.get('writingtools_courius_revision_v1'), '4');
  assert.ok(Number(values.get('writingtools_courius_updated_at')) > 0);
});
