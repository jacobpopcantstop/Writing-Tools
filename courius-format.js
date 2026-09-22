(function (root) {
  'use strict';

  // Letter paper with standard screenplay margins: 1.5in left, 1in elsewhere.
  // Indents are in twips (1440/inch) from the 1.5in left margin and match the
  // Courius editor's CSS (character 2.2in, parenthetical 1.6in/2.5in wide,
  // dialogue 1.1in/3.3in wide on a 6in text column).
  var RTF_PAGE = '\\paperw12240\\paperh15840\\margl2160\\margr1440\\margt1440\\margb1440';
  var UPPERCASE_TYPES = ['scene-heading', 'character', 'transition'];

  // Spacing mirrors the page: a blank line after action, dialogue, headings
  // and transitions; none between a character cue, its parenthetical and
  // its dialogue.
  function rtfPrefix(type) {
    switch (type) {
      case 'scene-heading': return '\\pard\\sa240\\sb240\\li0\\ri0\\ql\\keepn ';
      case 'character':     return '\\pard\\sa0\\sb0\\li3168\\ri0\\ql\\keepn ';
      case 'parenthetical': return '\\pard\\sa0\\sb0\\li2304\\ri2736\\ql\\keepn ';
      case 'dialogue':      return '\\pard\\sa240\\sb0\\li1584\\ri2304\\ql ';
      case 'transition':    return '\\pard\\sa240\\sb0\\li0\\ri0\\qr ';
      case 'action':
      default:              return '\\pard\\sa240\\sb0\\li0\\ri0\\ql ';
    }
  }

  function rtfSuffix() {
    return '\\par';
  }

  // RTF is 7-bit: anything outside ASCII must be written as \uN? (signed
  // 16-bit UTF-16 code units, so astral characters become surrogate pairs)
  // or Word renders curly quotes and em dashes as mojibake.
  function escapeRtf(text) {
    var escaped = String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\r\n|\r|\n/g, '\\line ');
    var out = '';
    for (var i = 0; i < escaped.length; i += 1) {
      var code = escaped.charCodeAt(i);
      if (code < 128) {
        out += escaped.charAt(i);
      } else {
        out += '\\u' + (code > 32767 ? code - 65536 : code) + '?';
      }
    }
    return out;
  }

  function buildRtf(doc) {
    var d = doc || {};
    var sections = [];
    if (d.title || d.author || d.contact) {
      // Title roughly a third of the way down, contact block near the bottom.
      for (var i = 0; i < 18; i += 1) sections.push('\\pard\\par');
      if (d.title) sections.push('\\pard\\qc\\sa240\\sb0\\fs24\\ul ' + escapeRtf(String(d.title).toUpperCase()) + '\\ul0\\par');
      if (d.author) {
        sections.push('\\pard\\qc\\sa240\\sb0\\fs24 by\\par');
        sections.push('\\pard\\qc\\sa240\\sb0\\fs24 ' + escapeRtf(d.author) + '\\par');
      }
      if (d.contact) {
        for (var j = 0; j < 16; j += 1) sections.push('\\pard\\par');
        sections.push('\\pard\\ql\\sa0\\sb0\\fs24 ' + escapeRtf(d.contact) + '\\par');
      }
      sections.push('\\page');
    }
    (d.elements || []).forEach(function (el) {
      var type = (el && el.type) || 'action';
      var text = String((el && el.text) || '').trim();
      if (!text) return;
      if (UPPERCASE_TYPES.indexOf(type) !== -1) text = text.toUpperCase();
      sections.push(rtfPrefix(type) + escapeRtf(text) + rtfSuffix(type));
    });
    return '{\\rtf1\\ansi\\ansicpg1252\\deff0' +
      '{\\fonttbl{\\f0\\fmodern Courier New;}}' +
      RTF_PAGE +
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

  function fdxParagraph(el) {
    var type = (el && el.type) || 'action';
    return '<Paragraph Type="' + fdxType(type) + '"><Text>' +
      escapeXml(String((el && el.text) || '').trim()) + '</Text></Paragraph>';
  }

  function titleParagraph(text, alignment) {
    return '<Paragraph Alignment="' + alignment + '"><Text>' + escapeXml(text || '') + '</Text></Paragraph>';
  }

  // Final Draft keeps the title page as aligned, untyped paragraphs inside
  // <TitlePage><Content>. Blank paragraphs push the title down the page and
  // the contact block toward the bottom.
  function buildTitlePage(d) {
    var parts = [];
    var blanks = function (n) { for (var i = 0; i < n; i += 1) parts.push(titleParagraph('', 'Center')); };
    blanks(16);
    if (d.title) parts.push(titleParagraph(String(d.title).toUpperCase(), 'Center'));
    if (d.author) {
      blanks(1);
      parts.push(titleParagraph('Written by', 'Center'));
      blanks(1);
      parts.push(titleParagraph(d.author, 'Center'));
    }
    if (d.contact) {
      blanks(18);
      String(d.contact).split(/\r?\n/).forEach(function (line) { parts.push(titleParagraph(line, 'Left')); });
    }
    return '<TitlePage><Content>' + parts.join('') + '</Content></TitlePage>';
  }

  // Elements sharing a `dual` group id become one Final Draft dual-dialogue
  // paragraph: <Paragraph><DualDialogue>left speech, right speech</DualDialogue></Paragraph>.
  function buildFdx(doc) {
    var d = doc || {};
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><FinalDraft DocumentType="Script" Template="No" Version="1">';
    xml += '<Content>';
    var els = d.elements || [];
    for (var i = 0; i < els.length; i += 1) {
      var el = els[i];
      if (el && el.dual) {
        var group = [];
        while (i < els.length && els[i] && els[i].dual === el.dual) { group.push(els[i]); i += 1; }
        i -= 1;
        xml += '<Paragraph><DualDialogue>' + group.map(fdxParagraph).join('') + '</DualDialogue></Paragraph>';
      } else {
        xml += fdxParagraph(el);
      }
    }
    xml += '</Content>';
    if (d.title || d.author || d.contact) xml += buildTitlePage(d);
    xml += '</FinalDraft>';
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
      var el = { type: classifyType(item.className), text: String(item.text || '') };
      if (item.dual) el.dual = item.dual;
      acc.push(el);
      return acc;
    }, []);
  }


  var SCENE_HEADING_RE = /^(?:INT\.?\/EXT|EXT\.?\/INT|I\/E|INT|EXT|EST)[.\s]/i;
  var TRANSITION_RE = /^(?:[A-Z0-9 .'-]+ TO:|FADE (?:IN|OUT)[.:]?|FADE TO BLACK\.?|CUT TO BLACK\.?)$/;

  function isAllCaps(line) {
    return /[A-Z]/.test(line) && line === line.toUpperCase();
  }

  // Turns pasted plain text (a script from a PDF, email, or another app)
  // into screenplay elements with Fountain-style rules: blank lines separate
  // paragraphs, INT./EXT. lines are scene headings, an all-caps line directly
  // above text is a character cue, and the lines under it are dialogue.
  function parsePlainScript(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n');
    var out = [];
    var inDialogue = false;
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].replace(/ /g, ' ').trim();
      if (!line) { inDialogue = false; continue; }
      var prevBlank = i === 0 || !lines[i - 1].trim();
      var nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (inDialogue) {
        out.push({ type: /^\(.*\)$/.test(line) ? 'parenthetical' : 'dialogue', text: line });
        continue;
      }
      if (SCENE_HEADING_RE.test(line)) {
        out.push({ type: 'scene-heading', text: line.toUpperCase() });
      } else if (TRANSITION_RE.test(line)) {
        out.push({ type: 'transition', text: line });
      } else if (prevBlank && nextLine && isAllCaps(line) && line.length <= 40 && !/[.!?:]$/.test(line.replace(/\([^)]*\)$/, '').trim())) {
        out.push({ type: 'character', text: line });
        inDialogue = true;
      } else {
        // Wrapped lines of one paragraph (no blank line between) join up.
        var last = out[out.length - 1];
        if (last && last.type === 'action' && !prevBlank) last.text += ' ' + line;
        else out.push({ type: 'action', text: line });
      }
    }
    return out;
  }

  var WTScreenplay = { rtfPrefix: rtfPrefix, rtfSuffix: rtfSuffix, escapeRtf: escapeRtf, buildRtf: buildRtf, escapeXml: escapeXml, fdxType: fdxType, buildFdx: buildFdx, extractElements: extractElements, classifyType: classifyType, parsePlainScript: parsePlainScript };
  if (typeof module !== 'undefined' && module.exports) module.exports = WTScreenplay;
  if (root) root.WTScreenplay = WTScreenplay;
})(typeof window !== 'undefined' ? window : null);
