(function (root) {
  'use strict';
  var BANK = {
    themes: [
      { id: 'wound', label: 'The Wound', questions: [
        { id: 'wound-origin', prompt: 'What happened to your character that they have never fully told anyone?',
          followUps: [{ trigger: { type: 'keyword', value: 'family' }, prompt: 'Who in the family knows, and why has no one spoken of it?' }] },
        { id: 'wound-scar', prompt: 'What does your character do now, in small daily ways, because of that old hurt?' },
        { id: 'wound-blame', prompt: 'Who does your character blame for it — and is that the truth?' },
        { id: 'wound-cost', prompt: 'What has carrying this wound cost them that they pretend not to miss?',
          followUps: [{ trigger: { type: 'minLength', value: 240 }, prompt: 'You wrote a lot. What is the one sentence underneath all of it?' }] }
      ]},
      { id: 'fear', label: 'The Fear', questions: [
        { id: 'fear-worst', prompt: 'What is the outcome your character would do almost anything to avoid?' },
        { id: 'fear-tell', prompt: 'How does their body betray that fear before their words do?' },
        { id: 'fear-mask', prompt: 'What do they pretend to fear instead, to hide the real one?' },
        { id: 'fear-trigger', prompt: 'What ordinary thing can suddenly bring the fear roaring back?' }
      ]},
      { id: 'contradiction', label: 'The Contradiction', questions: [
        { id: 'contra-belief', prompt: 'What is your character certain they are right about — and quietly wrong about?' },
        { id: 'contra-act', prompt: 'Where do their actions contradict the values they claim?' },
        { id: 'contra-defend', prompt: 'How do they explain that gap to themselves?' },
        { id: 'contra-witness', prompt: 'Who has noticed the contradiction, and what did they do about it?' }
      ]},
      { id: 'desire', label: 'The Desire', questions: [
        { id: 'desire-want', prompt: 'What does your character want badly enough to risk looking foolish for?' },
        { id: 'desire-secret', prompt: 'What do they want that they would never admit out loud?' },
        { id: 'desire-price', prompt: 'What are they willing to sacrifice to get it — and what should they not be?' },
        { id: 'desire-substitute', prompt: 'What smaller thing do they chase instead, because the real desire feels impossible?' }
      ]},
      { id: 'mask', label: 'The Mask', questions: [
        { id: 'mask-public', prompt: 'Who does your character pretend to be when they walk into a room?' },
        { id: 'mask-slip', prompt: 'In what moment does the mask slip, and who gets to see it?' },
        { id: 'mask-cost', prompt: 'What does maintaining the mask exhaust in them?' },
        { id: 'mask-origin', prompt: 'When did they first learn they needed it?' }
      ]},
      { id: 'relationships', label: 'The Relationships', questions: [
        { id: 'rel-closest', prompt: 'Who knows your character best, and what do they still get wrong about them?' },
        { id: 'rel-debt', prompt: 'Who does your character owe — a debt of money, guilt, or love — and how do they carry it?' },
        { id: 'rel-enemy', prompt: 'Who would your character cross the street to avoid, and why?' },
        { id: 'rel-change', prompt: 'Which relationship is quietly changing them right now, for better or worse?' }
      ]}
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = BANK;
  if (root) root.WTCharacterQuestions = BANK;
})(typeof window !== 'undefined' ? window : null);
