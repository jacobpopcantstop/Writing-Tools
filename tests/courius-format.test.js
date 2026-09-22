const { test } = require('node:test');
const assert = require('node:assert');
const WT = require('../courius-format.js');

test('rtfPrefix: scene heading is flush left with space before and after', () => {
  assert.strictEqual(WT.rtfPrefix('scene-heading'), '\\pard\\sa240\\sb240\\li0\\ri0\\ql\\keepn ');
});
test('rtfPrefix: action is left-aligned, flush', () => {
  assert.strictEqual(WT.rtfPrefix('action'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
test('rtfPrefix: character is indented 2.2in with no blank line before its dialogue', () => {
  assert.strictEqual(WT.rtfPrefix('character'), '\\pard\\sa0\\sb0\\li3168\\ri0\\ql\\keepn ');
});
test('rtfPrefix: dialogue li1584 ri2304', () => {
  assert.strictEqual(WT.rtfPrefix('dialogue'), '\\pard\\sa240\\sb0\\li1584\\ri2304\\ql ');
});
test('rtfPrefix: parenthetical li2304 ri2736, not italic', () => {
  assert.strictEqual(WT.rtfPrefix('parenthetical'), '\\pard\\sa0\\sb0\\li2304\\ri2736\\ql\\keepn ');
});
test('rtfPrefix: transition right-aligned, flush', () => {
  assert.strictEqual(WT.rtfPrefix('transition'), '\\pard\\sa240\\sb0\\li0\\ri0\\qr ');
});
test('rtfPrefix: unknown type defaults to action', () => {
  assert.strictEqual(WT.rtfPrefix('weird'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});

test('escapeRtf escapes backslash, braces, newlines', () => {
  assert.strictEqual(WT.escapeRtf('a\\b{c}\nd'), 'a\\\\b\\{c\\}\\line d');
});
test('escapeRtf writes non-ASCII as unicode escapes', () => {
  assert.strictEqual(WT.escapeRtf('Café it’s — ok'), 'Caf\\u233? it\\u8217?s \\u8212? ok');
  assert.strictEqual(WT.escapeRtf('😀'), '\\u-10179?\\u-8704?');
});
test('buildRtf: sets letter paper with 1.5in left margin', () => {
  const rtf = WT.buildRtf({ elements: [{ type: 'action', text: 'x' }] });
  assert.ok(rtf.includes('\\paperw12240\\paperh15840\\margl2160\\margr1440\\margt1440\\margb1440'));
});
test('buildRtf: title page ends with a page break', () => {
  const rtf = WT.buildRtf({ title: 'T', author: 'A', elements: [{ type: 'action', text: 'x' }] });
  assert.ok(rtf.indexOf('\\page') > rtf.indexOf('A\\par') && rtf.indexOf('\\page') < rtf.indexOf(' x\\par'));
});
test('buildRtf: blank elements are skipped and cues are uppercased', () => {
  const rtf = WT.buildRtf({ elements: [{ type: 'character', text: 'bob' }, { type: 'action', text: '' }] });
  assert.ok(rtf.includes(' BOB\\par'));
  assert.ok(!rtf.includes('\\pard\\par'));
});

test('parsePlainScript: splits a pasted scene into elements', () => {
  const els = WT.parsePlainScript('int. garage - day\n\nSally walks in,\nsoaking wet.\n\nSALLY\n(quietly)\nHi.\nAnyone home?\n\nCUT TO:\n');
  assert.deepStrictEqual(els, [
    { type: 'scene-heading', text: 'INT. GARAGE - DAY' },
    { type: 'action', text: 'Sally walks in, soaking wet.' },
    { type: 'character', text: 'SALLY' },
    { type: 'parenthetical', text: '(quietly)' },
    { type: 'dialogue', text: 'Hi.' },
    { type: 'dialogue', text: 'Anyone home?' },
    { type: 'transition', text: 'CUT TO:' }
  ]);
});
test('parsePlainScript: an all-caps shout in action is not a character cue', () => {
  const els = WT.parsePlainScript('BOOM!\n\nThe door flies open.');
  assert.deepStrictEqual(els.map((e) => e.type), ['action', 'action']);
});
test('parsePlainScript: character extensions stay cues', () => {
  const els = WT.parsePlainScript('MOM (V.O.)\nDinner!');
  assert.deepStrictEqual(els.map((e) => e.type), ['character', 'dialogue']);
});
test('buildRtf: 12pt Courier, types formatted', () => {
  const rtf = WT.buildRtf({
    title: 'MY FILM', author: 'Jane Doe', contact: 'jane@x.com',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'action', text: 'A pause.' },
      { type: 'character', text: 'JANE' },
      { type: 'dialogue', text: 'Hello.' }
    ]
  });
  assert.ok(rtf.startsWith('{\\rtf1\\ansi\\ansicpg1252\\deff0'));
  assert.ok(rtf.includes('{\\fonttbl{\\f0\\fmodern Courier New;}}'));
  assert.ok(rtf.includes('\\fs24'));
  assert.ok(!rtf.includes('\\fs32'));
  assert.ok(!rtf.includes('\\fs20'));
  assert.ok(rtf.includes('\\li3168'));
  assert.ok(rtf.includes('INT. ROOM - DAY'));
  assert.ok(rtf.trim().endsWith('}'));
});
test('buildRtf: title page is all 12pt centered', () => {
  const rtf = WT.buildRtf({ title: 'T', author: 'A', contact: 'C', elements: [] });
  assert.ok(rtf.includes('\\pard\\qc\\sa240\\sb0\\fs24'));
});

test('buildFdx maps element types and escapes XML', () => {
  const fdx = WT.buildFdx({
    title: 'My <Film>', author: 'A & B',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'character', text: 'JANE' },
      { type: 'dialogue', text: 'Hi & bye' },
      { type: 'parenthetical', text: '(softly)' },
      { type: 'transition', text: 'CUT TO:' },
      { type: 'action', text: 'A pause.' }
    ]
  });
  assert.ok(fdx.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(fdx.includes('<Title>My &lt;Film&gt;</Title>'));
  assert.ok(fdx.includes('<Author>A &amp; B</Author>'));
  assert.ok(fdx.includes('<Paragraph Type="Scene Heading">'));
  assert.ok(fdx.includes('<Paragraph Type="Character">'));
  assert.ok(fdx.includes('<Paragraph Type="Dialogue"><Text>Hi &amp; bye</Text>'));
  assert.ok(fdx.includes('<Paragraph Type="Parenthetical">'));
  assert.ok(fdx.includes('<Paragraph Type="Transition">'));
  assert.ok(fdx.includes('<Paragraph Type="Action">'));
  assert.ok(fdx.endsWith('</Content></FinalDraft>'));
});

test('extractElements drops import markers, snapshots, and title-page container', () => {
  const raw = [
    { className: 'title-page-container', text: 'MY FILM' },
    { className: 'action courius-import-marker', text: 'WRIBBON imported 1/2/2026' },
    { className: 'scene-heading', text: 'INT. ROOM - DAY' },
    { className: 'action', text: 'A pause.' },
    { className: 'action snapshot-marker', text: 'SNAPSHOT restored' }
  ];
  const out = WT.extractElements(raw);
  assert.deepStrictEqual(out, [
    { type: 'scene-heading', text: 'INT. ROOM - DAY' },
    { type: 'action', text: 'A pause.' }
  ]);
});
test('extractElements normalizes class to first known token', () => {
  const out = WT.extractElements([{ className: 'character extra-class', text: 'JANE' }]);
  assert.deepStrictEqual(out, [{ type: 'character', text: 'JANE' }]);
});
