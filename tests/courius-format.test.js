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
