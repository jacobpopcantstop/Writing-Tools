const test = require('node:test');
const assert = require('node:assert');
const BH = require('../beathive-core.js');

test('normalizeState drops junk and picks a valid active ladder', () => {
  const state = BH.normalizeState({
    inbox: [{ text: '  ' }, { text: 'A dentist who only speaks in riddles', source: 'Joterie' }, null],
    ladders: [{ id: 'a', name: '', rungs: ['one', { text: 'two', tops: true }, 5] }],
    activeId: 'missing'
  });
  assert.strictEqual(state.inbox.length, 1);
  assert.strictEqual(state.inbox[0].source, 'Joterie');
  assert.strictEqual(state.ladders[0].name, 'Untitled Sketch');
  assert.deepStrictEqual(state.ladders[0].rungs.map((r) => [r.text, r.tops]), [['one', false], ['two', true]]);
  assert.strictEqual(state.activeId, 'a');
});

test('handoffToInbox turns jots, twists, and Synax topics into inbox items', () => {
  const items = BH.handoffToInbox([
    { topic: 'Prompt', jots: ['jot one', '', 'jot two'], source: 'Joterie' },
    { topic: 'Space', constraints: 'noun: comet', source: 'Synax' },
    { topic: '', source: 'Synax' }
  ]);
  assert.deepStrictEqual(items.map((i) => [i.text, i.detail, i.source]), [
    ['jot one', 'Prompt', 'Joterie'],
    ['jot two', 'Prompt', 'Joterie'],
    ['Space', 'noun: comet', 'Synax']
  ]);
  assert.strictEqual(BH.handoffToInbox({ topic: 'Solo', source: 'ThisButThat' })[0].text, 'Solo');
  assert.deepStrictEqual(BH.handoffToInbox(null), []);
});

test('migrateLegacySketches maps hex cells into a ladder and skips the tutorial', () => {
  const ladders = BH.migrateLegacySketches([{
    id: 'old', name: 'Gym Sketch', cells: [
      { q: 0, r: 0, type: 'setup', content: 'WELCOME TO BEATHIVE\n\nThis is your infinite narrative canvas.' },
      { q: 1, r: 1, type: 'heightening', content: 'He spots a toddler' },
      { q: 1, r: 0, type: 'heightening', content: 'He spots a dumbbell' },
      { q: 0, r: 1, type: 'setup', content: 'A gym.' },
      { q: 0, r: 2, type: 'inciting', content: 'The trainer spots everything.' },
      { q: 2, r: 0, type: 'blowoff', content: 'He spots the audience.' },
      { q: 2, r: 1, type: 'note', content: 'keep it short' }
    ]
  }, { id: 'empty', name: 'x', cells: [] }]);
  assert.strictEqual(ladders.length, 1);
  const l = ladders[0];
  assert.strictEqual(l.name, 'Gym Sketch');
  assert.strictEqual(l.base, 'A gym.');
  assert.strictEqual(l.weird, 'The trainer spots everything.');
  assert.deepStrictEqual(l.rungs.map((r) => r.text), ['He spots a dumbbell', 'He spots a toddler']);
  assert.strictEqual(l.button, 'He spots the audience.');
  assert.strictEqual(l.notes, 'keep it short');
});

test('ladderStats and ladderHints track what the ladder still needs', () => {
  const l = BH.newLadder({ base: 'Office', weird: 'Boss is a horse', game: 'Nobody mentions it',
    rungs: [{ text: 'horse signs memo' }, { text: 'horse fires Dave', tops: true }, { text: 'horse eats hay', tops: false }] });
  const stats = BH.ladderStats(l);
  assert.deepStrictEqual(stats, { rungs: 3, toppers: 2, filled: 4, total: 5 });
  const hints = BH.ladderHints(l).join(' ');
  assert.match(hints, /1 rung doesn't top/);
  assert.match(hints, /button/);
  assert.match(BH.ladderHints(BH.newLadder({})).join(' '), /base reality/);
});

test('ladderToCouriusHtml builds an escaped skeleton with numbered rungs', () => {
  const html = BH.ladderToCouriusHtml({ base: 'A <b>bar</b>', game: 'x', rungs: ['one', ' ', 'two'], button: 'end' });
  assert.ok(html.startsWith('<div class="scene-heading">INT. LOCATION - DAY</div>'));
  assert.ok(html.includes('[BASE REALITY] A &lt;b&gt;bar&lt;/b&gt;'));
  assert.ok(html.includes('[FIRST UNUSUAL THING] ...'));
  assert.ok(html.includes('[HEIGHTEN 1] one'));
  assert.ok(html.includes('[HEIGHTEN 2] two'));
  assert.ok(!html.includes('[HEIGHTEN 3]'));
  assert.ok(html.includes('[BUTTON] end'));
});

test('ladderToText produces a readable outline', () => {
  const text = BH.ladderToText({ name: 'Horse Boss', game: 'Nobody mentions it', rungs: ['memo', 'firing'] });
  assert.ok(text.startsWith('HORSE BOSS\n'));
  assert.ok(text.includes('GAME: Nobody mentions it'));
  assert.ok(text.includes('1. memo\n2. firing'));
});

test('queueHandoff keeps every handoff made before BeatHive opens', () => {
  const values = new Map([['writingtools_beathive_handoff_v1', JSON.stringify({ topic: 'legacy single', source: 'Synax' })]]);
  const storage = { getItem: (k) => (values.has(k) ? values.get(k) : null), setItem: (k, v) => values.set(k, String(v)) };
  assert.ok(BH.queueHandoff({ topic: 'a', jots: ['x'], source: 'Joterie' }, storage));
  assert.ok(BH.queueHandoff({ topic: 'b', source: 'Synax' }, storage));
  const items = BH.handoffToInbox(JSON.parse(values.get('writingtools_beathive_handoff_v1')));
  assert.deepStrictEqual(items.map((i) => i.text), ['legacy single', 'x', 'b']);
});
