(function (root) {
  'use strict';

  // All indents in twips (1440/inch), measured from a 1.5" left / 1" right page margin.
  function rtfPrefix(type) {
    switch (type) {
      case 'scene-heading': return '\\pard\\sa240\\sb0\\li0\\ri0\\ql ';
      case 'character':     return '\\pard\\sa240\\sb0\\li3168\\ri0\\ql ';
      case 'parenthetical': return '\\pard\\sa240\\sb0\\li2304\\ri2880\\ql\\i ';
      case 'dialogue':      return '\\pard\\sa240\\sb0\\li1440\\ri2160\\ql ';
      case 'transition':    return '\\pard\\sa240\\sb0\\li0\\ri0\\qr ';
      case 'action':
      default:              return '\\pard\\sa240\\sb0\\li0\\ri0\\ql ';
    }
  }

  function rtfSuffix(type) {
    return type === 'parenthetical' ? '\\i0\\par' : '\\par';
  }

  var WTScreenplay = { rtfPrefix: rtfPrefix, rtfSuffix: rtfSuffix };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
