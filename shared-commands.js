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
      { id: 'open-synax', title: 'Open Synax', desc: 'Concept and serendipity ideation', keys: 'idea concept synax', run: function () { openTool('Synax.html'); } },
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
