(function () {
  'use strict';

  var TOOLS = [
    {
      id: 'CharacterForge',
      label: 'Character Forge',
      path: 'CharacterForge.html',
      category: 'Ideation',
      commandDesc: 'Q&A character builder',
      commandKeys: 'character forge people role goal',
      snapshotKey: 'writingtools_characterforge_snapshots_v1'
    },
    {
      id: 'Synax',
      label: 'Synax',
      path: 'Synax.html',
      category: 'Ideation',
      commandDesc: 'Random word & concept generator',
      commandKeys: 'idea concept synax',
      snapshotKey: 'writingtools_synax_snapshots_v1'
    },
    {
      id: 'ThisButThat',
      label: 'ThisButThat',
      path: 'ThisButThat.html',
      category: 'Ideation',
      commandDesc: 'Wikipedia topics + notepad',
      commandKeys: 'twist premise thisbutthat',
      snapshotKey: 'writingtools_thisbutthat_snapshots_v1'
    },
    {
      id: 'Joterie',
      label: 'Joterie',
      path: 'Joterie.html',
      category: 'Ideation',
      commandDesc: 'Timed brainstorm sprints',
      commandKeys: 'joterie jot cards harvest',
      snapshotKey: 'writingtools_joterie_snapshots_v1'
    },
    {
      id: 'BeatHive',
      label: 'BeatHive',
      path: 'BeatHive.html',
      category: 'Drafting',
      commandDesc: 'Hex-grid beat mapping',
      commandKeys: 'structure map beathive',
      snapshotKey: 'writingtools_beathive_snapshots_v1'
    },
    {
      id: 'Wribbon',
      label: 'Wribbon',
      path: 'Wribbon.html',
      category: 'Drafting',
      commandDesc: 'Distraction-free writing pad',
      commandKeys: 'wribbon draft ribbon export',
      snapshotKey: 'writingtools_wribbon_snapshots_v1'
    },
    {
      id: 'WitherNaught',
      label: 'WitherNaught',
      path: 'WitherNaught.html',
      category: 'Drafting',
      commandDesc: 'Timed flow-writing game',
      commandKeys: 'draft withernaught flowstate',
      snapshotKey: 'writingtools_withernaught_snapshots_v1'
    },
    {
      id: 'Courius',
      label: 'Courius',
      path: 'Courius.html',
      category: 'Output',
      commandDesc: 'Screenplay editor + FDX/RTF export',
      commandKeys: 'screenplay courius script',
      snapshotKey: 'writingtools_courius_snapshots_v1'
    },
    {
      id: 'PaperCut',
      label: 'PaperCut',
      path: 'PaperCut.html',
      category: 'Output',
      commandDesc: 'PDF editor & converter',
      commandKeys: 'pdf papercut annotate markup',
      snapshotKey: 'writingtools_papercut_snapshots_v1'
    }
  ];

  var byId = TOOLS.reduce(function (acc, tool) {
    acc[tool.id] = tool;
    return acc;
  }, {});

  function cloneTool(tool) {
    return tool ? Object.assign({}, tool) : null;
  }

  window.WTToolManifest = {
    listTools: function () {
      return TOOLS.map(cloneTool);
    },
    getTool: function (id) {
      return cloneTool(byId[String(id || '')] || null);
    },
    categoryForTool: function (id) {
      var tool = byId[String(id || '')];
      return tool ? tool.category : 'Other';
    },
    listSnapshotEntries: function () {
      return TOOLS.filter(function (tool) {
        return !!tool.snapshotKey;
      }).map(cloneTool);
    }
  };
})();
