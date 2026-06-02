const { test } = require('node:test');
const assert = require('node:assert');
const Engine = require('../characterforge-engine.js');
const BANK = require('../characterforge-questions.js');

test('buildQueue flattens themes into ordered base questions', () => {
  const q = Engine.buildQueue(BANK);
  assert.strictEqual(q[0].id, 'wound-origin');
  assert.ok(q.every(item => item.themeId && item.id && item.prompt));
});
test('evalFollowUps fires minLength trigger', () => {
  const q = { id: 'x', prompt: 'p', followUps: [{ trigger: { type: 'minLength', value: 10 }, prompt: 'deeper' }] };
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'short'), []);
  assert.deepStrictEqual(
    Engine.evalFollowUps(q, 'this is definitely long enough').map(f => f.prompt),
    ['deeper']);
});
test('evalFollowUps fires keyword trigger case-insensitively', () => {
  const q = { id: 'x', prompt: 'p', followUps: [{ trigger: { type: 'keyword', value: 'family' }, prompt: 'who?' }] };
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'My FAMILY did').map(f => f.prompt), ['who?']);
  assert.deepStrictEqual(Engine.evalFollowUps(q, 'nobody'), []);
});
test('buildSheet renders only answered sections as prose with theme headings', () => {
  const sheet = Engine.buildSheet(BANK, {
    'wound-origin': 'A car crash.',
    'fear-worst': 'Being forgotten.'
  });
  assert.ok(sheet.includes('The Wound'));
  assert.ok(sheet.includes('A car crash.'));
  assert.ok(sheet.includes('The Fear'));
  assert.ok(!sheet.includes('The Mask'));
});
