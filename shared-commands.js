(function () {
  'use strict';

  function noop() {}

  function build(handlers) {
    var h = handlers && typeof handlers === 'object' ? handlers : {};
    var openTool = typeof h.openTool === 'function' ? h.openTool : noop;
    var saveContext = typeof h.saveContext === 'function' ? h.saveContext : noop;
    var clearContext = typeof h.clearContext === 'function' ? h.clearContext : noop;
    var toggleTheme = typeof h.toggleTheme === 'function' ? h.toggleTheme : noop;
    var manifest = window.WTToolManifest;
    var toolCommands = manifest && typeof manifest.listTools === 'function'
      ? manifest.listTools().map(function (tool) {
          return {
            id: 'open-' + String(tool.id || '').toLowerCase(),
            title: 'Open ' + String(tool.label || tool.id || 'Tool'),
            desc: String(tool.commandDesc || 'Open tool'),
            keys: String(tool.commandKeys || ''),
            run: function () { openTool(tool.path); }
          };
        })
      : [
          { id: 'open-synax', title: 'Open Synax', desc: 'Random word & concept generator', keys: 'idea concept synax', run: function () { openTool('Synax.html'); } },
          { id: 'open-characterforge', title: 'Open Character Forge', desc: 'Q&A character builder', keys: 'character forge people role goal', run: function () { openTool('CharacterForge.html'); } },
          { id: 'open-thisbutthat', title: 'Open ThisButThat', desc: 'Wikipedia topics + notepad', keys: 'twist premise thisbutthat', run: function () { openTool('ThisButThat.html'); } },
          { id: 'open-joterie', title: 'Open Joterie', desc: 'Timed brainstorm sprints', keys: 'joterie jot cards harvest', run: function () { openTool('Joterie.html'); } },
          { id: 'open-beathive', title: 'Open BeatHive', desc: 'Hex-grid beat mapping', keys: 'structure map beathive', run: function () { openTool('BeatHive.html'); } },
          { id: 'open-wribbon', title: 'Open Wribbon', desc: 'Distraction-free writing pad', keys: 'wribbon draft ribbon export', run: function () { openTool('Wribbon.html'); } },
          { id: 'open-withernaught', title: 'Open WitherNaught', desc: 'Timed flow-writing game', keys: 'draft withernaught flowstate', run: function () { openTool('WitherNaught.html'); } },
          { id: 'open-courius', title: 'Open Courius', desc: 'Screenplay editor + FDX/RTF export', keys: 'screenplay courius', run: function () { openTool('Courius.html'); } },
          { id: 'open-papercut', title: 'Open PaperCut', desc: 'PDF editor & converter', keys: 'pdf papercut annotate markup', run: function () { openTool('PaperCut.html'); } }
        ];

    return [
      { id: 'open-home', title: 'Open Suite Home', desc: 'Return to the Writing Tools hub', keys: 'home hub index suite', run: function () { openTool('index.html'); } },
      { id: 'open-recent-hub', title: 'Open Recent Sessions Hub', desc: 'Jump to the index recent-session browser', keys: 'recent sessions hub resume', run: function () { openTool('index.html#recent-sessions'); } },
      { id: 'open-recovery-hub', title: 'Open Recovery Snapshots Hub', desc: 'Jump to the index snapshot recovery panel', keys: 'recovery snapshots backups restore hub', run: function () { openTool('index.html#recovery-grid'); } },
      { id: 'open-export-reliability', title: 'Open Export Reliability Hub', desc: 'Jump to the index export telemetry panel', keys: 'export reliability gmail email telemetry hub', run: function () { openTool('index.html#export-health-list'); } },
    ].concat(toolCommands).concat([
      { id: 'save-context', title: 'Save Context', desc: 'Push current context bus values', keys: 'save context bus', run: saveContext },
      { id: 'clear-context', title: 'Clear Context', desc: 'Reset shared context fields', keys: 'clear context reset', run: clearContext },
      { id: 'toggle-theme', title: 'Toggle Theme', desc: 'Switch between light and dark', keys: 'theme color mode', run: toggleTheme }
    ]);
  }

  window.WTCommands = {
    build: build
  };
})();
