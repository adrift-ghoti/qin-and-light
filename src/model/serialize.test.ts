import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from './serialize';
import { createPlaceholderNote } from './notes';
import { Project, PROJECT_VERSION } from './types';

function sampleProject(): Project {
  const complete = createPlaceholderNote({ startTime: 1, type: 'san' });
  complete.string = 1;
  const incomplete = createPlaceholderNote({ startTime: 2, type: 'an' }); // 未補弦號/位置的占位音
  return {
    version: PROJECT_VERSION,
    audio: { fileName: 'demo.mp3', durationSec: 42, sampleRate: 44100 },
    notes: [complete, incomplete],
  };
}

describe('serialize round-trip', () => {
  it('serializes then deserializes to an equal project, including incomplete placeholder notes', () => {
    const p = sampleProject();
    const json = serializeProject(p);
    const back = deserializeProject(json);
    expect(back).toEqual(p);
  });

  it('rejects JSON with a wrong/missing version', () => {
    expect(() => deserializeProject('{"notes":[]}')).toThrow();
  });

  it('rejects a project whose notes array contains a malformed note', () => {
    const p = sampleProject();
    const withBadNote = {
      ...p,
      notes: [{ ...p.notes[0], id: undefined }, p.notes[1]],
    };
    expect(() => deserializeProject(JSON.stringify(withBadNote))).toThrow(/note\[0\]/);
  });
});
