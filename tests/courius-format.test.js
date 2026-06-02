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
