(function () {
  'use strict';

  function noop() {}

  function build(handlers) {
    var h = handlers && typeof handlers === 'object' ? handlers : {};
    var openTool = typeof h.openTool === 'function' ? h.openTool : noop;
    var saveContext = typeof h.saveContext === 'function' ? h.saveContext : noop;
    var clearContext = typeof h.clearContext === 'function' ? h.clearContext : noop;
    var toggleTheme = typeof h.toggleTheme === 'function' ? h.toggleTheme : noop;

    return [
      { id: 'open-home', title: 'Open Suite Home', desc: 'Return to the Writing Tools hub', keys: 'home hub index suite', run: function () { openTool('index.html'); } },
      { id: 'open-recent-hub', title: 'Open Recent Sessions Hub', desc: 'Jump to the index recent-session browser', keys: 'recent sessions hub resume', run: function () { openTool('index.html#recent-sessions'); } },
      { id: 'open-recovery-hub', title: 'Open Recovery Snapshots Hub', desc: 'Jump to the index snapshot recovery panel', keys: 'recovery snapshots backups restore hub', run: function () { openTool('index.html#recovery-grid'); } },
      { id: 'open-export-reliability', title: 'Open Export Reliability Hub', desc: 'Jump to the index export telemetry panel', keys: 'export reliability gmail email telemetry hub', run: function () { openTool('index.html#export-health-list'); } },
      { id: 'open-synax', title: 'Open Synax', desc: 'Concept and serendipity ideation', keys: 'idea concept synax', run: function () { openTool('Synax.html'); } },
      { id: 'open-characterforge', title: 'Open Character Forge', desc: 'Character creation and remixing', keys: 'character forge people role goal', run: function () { openTool('CharacterForge.html'); } },
      { id: 'open-thisbutthat', title: 'Open ThisButThat', desc: 'Twist-based premise generation', keys: 'twist premise thisbutthat', run: function () { openTool('ThisButThat.html'); } },
      { id: 'open-beathive', title: 'Open BeatHive', desc: 'Structure and beat mapping', keys: 'structure map beathive', run: function () { openTool('BeatHive.html'); } },
      { id: 'open-withernaught', title: 'Open WitherNaught', desc: 'Fast drafting under pressure', keys: 'draft withernaught', run: function () { openTool('WitherNaught.html'); } },
      { id: 'open-courius', title: 'Open Courius', desc: 'Screenplay editing and output', keys: 'screenplay courius', run: function () { openTool('Courius.html'); } },
      { id: 'save-context', title: 'Save Context', desc: 'Push current context bus values', keys: 'save context bus', run: saveContext },
      { id: 'clear-context', title: 'Clear Context', desc: 'Reset shared context fields', keys: 'clear context reset', run: clearContext },
      { id: 'toggle-theme', title: 'Toggle Theme', desc: 'Switch between light and dark', keys: 'theme color mode', run: toggleTheme }
    ];
  }

  window.WTCommands = {
    build: build
  };
})();
