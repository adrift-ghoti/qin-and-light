import { create } from 'zustand';
import { Note, Project, EnvelopePoint, SlidePoint } from '../model/types';
import { parseHuiNotation, nearestHui } from '../model/guqin';
import { TechniqueDefinition, SlideShapeTechnique } from '../model/techniques';
import { DEFAULT_TECHNIQUES } from '../data/defaultTechniques';
import { createPlaceholderNote } from '../model/notes';

interface AudioMeta { fileName: string; durationSec: number; sampleRate: number; }
export type EditingField = 'string' | 'position';

interface AppState {
  notes: Note[];
  selectedId: string | null;
  editingField: EditingField;
  audio: AudioMeta | null;
  currentTime: number;
  editBuffer: string;

  // 指法庫
  techniques: TechniqueDefinition[];
  techniqueMenuOpen: boolean;
  // 走手音曲線編輯器選中的控制點索引；null = 隱含原點或無選中
  selectedSlidePointIndex: number | null;

  // Undo/Redo（只追蹤 notes 陣列）
  _past: Note[][];
  _future: Note[][];
  playbackRate: number;

  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  cycleEditingField: () => void;
  setNoteString: (id: string, string: number) => void;
  setNoteHuiNotation: (id: string, notation: string) => void;
  setNotePosition: (id: string, position: number) => void;
  setNoteAdsr: (id: string, adsr: EnvelopePoint[]) => void;
  setNoteSlide: (id: string, slide: SlidePoint[]) => void;
  setNoteJianzipu: (id: string, text: string) => void;
  nudgeNoteTime: (id: string, deltaSec: number) => void;
  setAudio: (a: AudioMeta) => void;
  setCurrentTime: (t: number) => void;
  setEditBuffer: (buffer: string) => void;
  loadProject: (p: Project) => void;
  reset: () => void;

  openTechniqueMenu: () => void;
  closeTechniqueMenu: () => void;
  setSelectedSlidePointIndex: (i: number | null) => void;
  /** promptDeltaFn: 當 deltaPosition===null 時呼叫，回傳絕對目標位置；回傳 null 則取消套用 */
  applyTechnique: (techniqueId: string, anchorTime: number, promptDeltaFn?: (label: string) => number | null) => void;
  importTechniques: (ts: TechniqueDefinition[], onConflict: 'rename' | 'overwrite') => void;
  setTechniques: (ts: TechniqueDefinition[]) => void;

  undo: () => void;
  redo: () => void;
  setPlaybackRate: (r: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  notes: [],
  selectedId: null,
  editingField: 'string',
  audio: null,
  currentTime: 0,
  editBuffer: '',
  techniques: DEFAULT_TECHNIQUES,
  techniqueMenuOpen: false,
  selectedSlidePointIndex: null,
  _past: [],
  _future: [],
  playbackRate: 1,

  addNote: (n) => set((s) => {
    const past = [...s._past, s.notes].slice(-50);
    return { notes: [...s.notes, n], _past: past, _future: [] };
  }),
  removeNote: (id) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.filter((n) => n.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        _past: past, _future: [],
      };
    }),
  selectNote: (id) => set({ selectedId: id, editingField: 'string' }),
  cycleEditingField: () =>
    set((s) => ({ editingField: s.editingField === 'string' ? 'position' : 'string' })),
  setNoteString: (id, string) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.map((n) => (n.id === id ? { ...n, string: string as Note['string'] } : n)),
        _past: past, _future: [],
      };
    }),
  setNoteHuiNotation: (id, notation) =>
    set((s) => {
      const note = s.notes.find(n => n.id === id);
      if (!note) return {};
      if (note.type === 'fan' && !/^\d{1,2}$/.test(notation.trim())) {
        throw new Error(`泛音只能使用整數徽位,不可帶小數: "${notation}"`);
      }
      const position = parseHuiNotation(notation);
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.map((n) => {
          if (n.id !== id) return n;
          return { ...n, huiNotation: notation, position, hui: n.type === 'fan' ? nearestHui(position) : n.hui };
        }),
        _past: past, _future: [],
      };
    }),
  setNotePosition: (id, position) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.map((n) => (n.id === id ? { ...n, position, huiNotation: undefined } : n)),
        _past: past, _future: [],
      };
    }),
  setNoteAdsr: (id, adsr) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return { notes: s.notes.map((n) => (n.id === id ? { ...n, adsr } : n)), _past: past, _future: [] };
    }),
  setNoteSlide: (id, slide) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return { notes: s.notes.map((n) => (n.id === id ? { ...n, slide } : n)), _past: past, _future: [] };
    }),
  setNoteJianzipu: (id, text) =>
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, jianzipu: text } : n)) })),
  nudgeNoteTime: (id, deltaSec) =>
    set((s) => {
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.map((n) => n.id === id ? { ...n, startTime: Math.max(0, n.startTime + deltaSec) } : n),
        _past: past, _future: [],
      };
    }),
  setAudio: (a) => set({ audio: a }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setEditBuffer: (buffer) => set({ editBuffer: buffer }),
  loadProject: (p) => set({ notes: p.notes, audio: p.audio, selectedId: null, editingField: 'string', editBuffer: '' }),
  reset: () => set({ notes: [], selectedId: null, editingField: 'string', audio: null, currentTime: 0, editBuffer: '' }),

  openTechniqueMenu: () => set({ techniqueMenuOpen: true }),
  closeTechniqueMenu: () => set({ techniqueMenuOpen: false }),
  setSelectedSlidePointIndex: (i) => set({ selectedSlidePointIndex: i }),
  setTechniques: (ts) => set({ techniques: ts }),

  applyTechnique: (techniqueId, anchorTime, promptDeltaFn) => {
    const { selectedId, notes, techniques, selectedSlidePointIndex } = get();
    if (!selectedId) return;
    const note = notes.find(n => n.id === selectedId);
    if (!note) return;

    const tech = techniques.find(t => t.id === techniqueId);
    if (!tech) return;

    if (tech.type === 'sequence') {
      const newNotes = tech.notes.map(tmpl =>
        createPlaceholderNote({ startTime: anchorTime + tmpl.offsetTime, type: tmpl.type })
      );
      set(s => {
        const past = [...s._past, s.notes].slice(-50);
        return { notes: [...s.notes, ...newNotes], _past: past, _future: [] };
      });
      return;
    }

    if (note.type !== 'an') return;

    const slide = note.slide ?? [];
    let anchorT = 0;
    let anchorPosition = note.position ?? 0.5;
    if (selectedSlidePointIndex !== null && slide[selectedSlidePointIndex]) {
      anchorT = slide[selectedSlidePointIndex].t;
      anchorPosition = slide[selectedSlidePointIndex].position;
    }

    const slideShape = tech as SlideShapeTechnique;
    const ts = slideShape.points.map(p => anchorT + p.t);
    const rangeMin = Math.min(...ts);
    const rangeMax = Math.max(...ts);
    const kept = slide.filter(p => p.t < rangeMin - 1e-9 || p.t > rangeMax + 1e-9);

    const newPts: SlidePoint[] = [];
    for (const shPt of slideShape.points) {
      let pos: number;
      if (shPt.deltaPosition === null) {
        if (!promptDeltaFn) continue;
        const absPos = promptDeltaFn(`${tech.name} 終點徽分`);
        if (absPos === null) return;
        pos = absPos;
      } else {
        pos = Math.max(0, Math.min(1, anchorPosition + shPt.deltaPosition));
      }
      newPts.push({ t: anchorT + shPt.t, position: pos, techniqueId });
    }

    const merged = [...kept, ...newPts].sort((a, b) => a.t - b.t);
    set(s => {
      const past = [...s._past, s.notes].slice(-50);
      return {
        notes: s.notes.map(n => n.id === selectedId ? { ...n, slide: merged } : n),
        _past: past, _future: [],
      };
    });
  },

  importTechniques: (ts, onConflict) => {
    set(s => {
      const existing = [...s.techniques];
      for (const t of ts) {
        const idx = existing.findIndex(e => e.id === t.id);
        if (idx >= 0) {
          if (onConflict === 'overwrite') existing[idx] = t;
        } else {
          existing.push(t);
        }
      }
      return { techniques: existing };
    });
  },

  undo: () => set(s => {
    if (s._past.length === 0) return {};
    const past = [...s._past];
    const prev = past.pop()!;
    return { notes: prev, _past: past, _future: [s.notes, ...s._future].slice(0, 50) };
  }),

  redo: () => set(s => {
    if (s._future.length === 0) return {};
    const [next, ...rest] = s._future;
    return { notes: next, _past: [...s._past, s.notes].slice(-50), _future: rest };
  }),

  setPlaybackRate: (r) => {
    set({ playbackRate: r });
    // engine 的 setPlaybackRate 會在 TransportBar 中呼叫
  },
}));
