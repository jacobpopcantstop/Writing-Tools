(function () {
  'use strict';

  var TOOLS = [
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
      id: 'Courius',
      label: 'Courius',
      path: 'Courius.html',
      category: 'Output',
      commandDesc: 'Screenplay editor + FDX/RTF export',
      commandKeys: 'screenplay courius script',
      snapshotKey: 'writingtools_courius_snapshots_v1'
    },
    {
      id: 'TextToFDX',
      label: 'Text to FDX',
      path: 'TextToFDX.html',
      category: 'Output',
      commandDesc: 'AI-assisted raw text to screenplay FDX',
      commandKeys: 'fdx screenplay format ai import text',
      snapshotKey: null
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
