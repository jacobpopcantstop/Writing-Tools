const { test } = require('node:test');
const assert = require('node:assert');
const WT = require('../courius-format.js');

test('rtfPrefix: scene heading is left-aligned, flush, plain', () => {
  assert.strictEqual(WT.rtfPrefix('scene-heading'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
test('rtfPrefix: action is left-aligned, flush', () => {
  assert.strictEqual(WT.rtfPrefix('action'), '\\pard\\sa240\\sb0\\li0\\ri0\\ql ');
});
test('rtfPrefix: character indents 3.7in from page edge (li3168)', () => {
  assert.strictEqual(WT.rtfPrefix('character'), '\\pard\\sa240\\sb0\\li3168\\ri0\\ql ');
});
test('rtfPrefix: dialogue li1440 ri2160', () => {
  assert.strictEqual(WT.rtfPrefix('dialogue'), '\\pard\\sa240\\sb0\\li1440\\ri2160\\ql ');
});
test('rtfPrefix: parenthetical li2304 ri2880 italic', () => {
  assert.strictEqual(WT.rtfPrefix('parenthetical'), '\\pard\\sa240\\sb0\\li2304\\ri2880\\ql\\i ');
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
test('buildRtf: 12pt Courier, blank elements become \\par, types formatted', () => {
  const rtf = WT.buildRtf({
    title: 'MY FILM', author: 'Jane Doe', contact: 'jane@x.com',
    elements: [
      { type: 'scene-heading', text: 'INT. ROOM - DAY' },
      { type: 'action', text: 'A pause.' },
      { type: 'character', text: 'JANE' },
      { type: 'dialogue', text: 'Hello.' }
    ]
  });
  assert.ok(rtf.startsWith('{\\rtf1\\ansi\\deff0'));
  assert.ok(rtf.includes('{\\fonttbl{\\f0 Courier New;}}'));
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
