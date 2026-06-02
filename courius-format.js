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

  function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  function fdxType(type) {
    switch (type) {
      case 'scene-heading': return 'Scene Heading';
      case 'character':     return 'Character';
      case 'dialogue':      return 'Dialogue';
      case 'parenthetical': return 'Parenthetical';
      case 'transition':    return 'Transition';
      default:              return 'Action';
    }
  }

  function buildFdx(doc) {
    var d = doc || {};
    var xml = '<?xml version="1.0" encoding="UTF-8"?><FinalDraft DocumentType="Script" Template="No" Version="1">';
    if (d.title || d.author) {
      xml += '<TitlePage><Title>' + escapeXml(d.title || '') + '</Title>' +
             '<Author>' + escapeXml(d.author || '') + '</Author></TitlePage>';
    }
    xml += '<Content>';
    (d.elements || []).forEach(function (el) {
      var type = (el && el.type) || 'action';
      xml += '<Paragraph Type="' + fdxType(type) + '"><Text>' +
             escapeXml(String((el && el.text) || '').trim()) + '</Text></Paragraph>';
    });
    xml += '</Content></FinalDraft>';
    return xml;
  }

  var KNOWN_TYPES = ['scene-heading', 'character', 'parenthetical', 'dialogue', 'transition', 'action'];
  var SKIP_CLASSES = ['title-page-container', 'courius-import-marker', 'snapshot-marker'];

  function classifyType(className) {
    var tokens = String(className || '').split(/\s+/);
    for (var i = 0; i < tokens.length; i += 1) {
      if (KNOWN_TYPES.indexOf(tokens[i]) !== -1) return tokens[i];
    }
    return 'action';
  }

  function shouldSkip(className) {
    var tokens = String(className || '').split(/\s+/);
    return tokens.some(function (t) { return SKIP_CLASSES.indexOf(t) !== -1; });
  }

  function extractElements(rawList) {
    return (rawList || []).reduce(function (acc, item) {
      if (!item || shouldSkip(item.className)) return acc;
      acc.push({ type: classifyType(item.className), text: String(item.text || '') });
      return acc;
    }, []);
  }

  var WTScreenplay = { rtfPrefix: rtfPrefix, rtfSuffix: rtfSuffix, escapeRtf: escapeRtf, buildRtf: buildRtf, escapeXml: escapeXml, fdxType: fdxType, buildFdx: buildFdx, extractElements: extractElements, classifyType: classifyType };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
