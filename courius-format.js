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

  function escapeRtf(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\r\n|\r|\n/g, '\\line ');
  }

  function buildRtf(doc) {
    var d = doc || {};
    var sections = [];
    if (d.title || d.author || d.contact) {
      if (d.title)   sections.push('\\pard\\qc\\sa240\\sb0\\fs24\\ul ' + escapeRtf(d.title) + '\\ul0\\par');
      if (d.author)  sections.push('\\pard\\qc\\sa240\\sb0\\fs24 ' + escapeRtf(d.author) + '\\par');
      if (d.contact) sections.push('\\pard\\qc\\sa240\\sb0\\fs24 ' + escapeRtf(d.contact) + '\\par');
      sections.push('\\pard\\par');
    }
    (d.elements || []).forEach(function (el) {
      var type = (el && el.type) || 'action';
      var text = String((el && el.text) || '').trim();
      if (!text) { sections.push('\\pard\\par'); return; }
      sections.push(rtfPrefix(type) + escapeRtf(text) + rtfSuffix(type));
    });
    return '{\\rtf1\\ansi\\deff0' +
      '{\\fonttbl{\\f0 Courier New;}}' +
      '\\viewkind4\\uc1\\pard\\f0\\fs24 ' +
      sections.join('') +
      '}';
  }

  var WTScreenplay = { rtfPrefix: rtfPrefix, rtfSuffix: rtfSuffix, escapeRtf: escapeRtf, buildRtf: buildRtf };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
