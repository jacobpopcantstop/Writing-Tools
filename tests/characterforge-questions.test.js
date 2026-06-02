const { test } = require('node:test');
const assert = require('node:assert');
const BANK = require('../characterforge-questions.js');

test('bank has the six themes in order', () => {
  assert.deepStrictEqual(BANK.themes.map(t => t.id),
    ['wound', 'fear', 'contradiction', 'desire', 'mask', 'relationships']);
});
test('every theme has at least 4 questions, each with id+prompt', () => {
  BANK.themes.forEach(theme => {
    assert.ok(theme.questions.length >= 4, theme.id + ' needs >=4 questions');
    theme.questions.forEach(q => {
      assert.ok(typeof q.id === 'string' && q.id.length > 0);
      assert.ok(typeof q.prompt === 'string' && q.prompt.length > 0);
    });
  });
});
test('all question ids are globally unique', () => {
  const ids = BANK.themes.flatMap(t => t.questions.map(q => q.id));
  assert.strictEqual(new Set(ids).size, ids.length);
});
test('follow-ups, when present, declare a trigger and prompt', () => {
  BANK.themes.flatMap(t => t.questions).forEach(q => {
    (q.followUps || []).forEach(f => {
      assert.ok(['minLength', 'keyword'].includes(f.trigger.type));
      assert.ok(typeof f.prompt === 'string' && f.prompt.length > 0);
    });
  });
});
