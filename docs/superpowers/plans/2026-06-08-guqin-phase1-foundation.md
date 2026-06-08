# 古琴聲光秀 第一步 — 地基切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個可執行的最小古琴聲光秀編輯器:能匯入音檔並播放、以 Canvas 繪製七弦十三徽、播放中點擊琴弦在當前時間建立「音事件」、在時間軸檢視/刪除、並能將整個專案匯出/匯入 JSON 且 round-trip 無損。

**Architecture:** React + TypeScript + Vite 單頁應用。純邏輯(資料模型、古琴常數、序列化)抽到 `src/model/` 並以 Vitest 做 TDD;狀態用 Zustand 集中於 `src/state/store.ts`;音訊封裝在 `src/audio/AudioEngine.ts`(Web Audio API 提供精確時鐘);UI 為四個職責單一的元件。Canvas 與音訊的視覺/聽覺行為以手動執行 dev server 驗證,可測的純邏輯一律先寫測試。

**Tech Stack:** React 18, TypeScript, Vite, Vitest + jsdom, Zustand, Web Audio API, Canvas 2D。

---

## File Structure

| 檔案 | 職責 |
|------|------|
| `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` / `src/main.tsx` / `src/App.tsx` | 專案骨架與進入點 |
| `src/model/types.ts` | 資料型別:`Project` `Note` `EnvelopePoint` `SlidePoint` `NoteType` |
| `src/model/guqin.ts` | 古琴常數:弦數、十三徽正規化位置、`position↔hui` 換算 |
| `src/model/notes.ts` | `createNote`、預設 ADSR、`uid` |
| `src/model/serialize.ts` | `serializeProject` / `deserializeProject`(round-trip) |
| `src/state/store.ts` | Zustand store:notes 增刪選取、目前時間、音檔 meta |
| `src/audio/AudioEngine.ts` | Web Audio:載入解碼、播放/暫停、`getTime()` |
| `src/components/TransportBar.tsx` | 載入音檔、播放/暫停、時間顯示 |
| `src/components/GuqinCanvas.tsx` | 繪製七弦十三徽、點擊建立音 |
| `src/components/Timeline.tsx` | 列出所有音、選取、刪除 |
| `src/components/ExportPanel.tsx` | 匯出/匯入 JSON |
| `src/model/*.test.ts` | 純邏輯單元測試 |

設計原則:`src/model/` 內全為**無副作用的純函式**,可在 jsdom 外獨立測試;UI 元件只讀寫 store,不持有業務邏輯。

---

## Task 1: 專案骨架與測試環境

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: 用 Vite 建立 React + TS 專案骨架**

在專案根目錄 `C:\Users\User\Desktop\Code Project\qin` 執行:

```bash
npm create vite@latest . -- --template react-ts
```

若目錄非空而中止,改為先在暫存資料夾建立再複製,或手動建立以下檔案。

- [ ] **Step 2: 安裝相依套件**

```bash
npm install
npm install zustand
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: 設定 Vitest**

在 `vite.config.ts` 加入 test 設定:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

在 `package.json` 的 `scripts` 加入:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 用一個健全性測試確認測試環境可運作**

Create `src/model/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test environment', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS,1 個測試通過。

- [ ] **Step 5: 確認 dev server 啟動**

Run: `npm run dev`
Expected: Vite 在 http://localhost:5173 啟動,瀏覽器顯示預設 React 頁面。確認後 Ctrl+C 停止。

- [ ] **Step 6: 刪除 sanity 測試並提交**

刪除 `src/model/sanity.test.ts`。

```bash
git init
git add -A
git commit -m "chore: scaffold Vite React TS project with Vitest"
```

---

## Task 2: 古琴常數與位置換算(TDD)

**Files:**
- Create: `src/model/guqin.ts`, `src/model/guqin.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/model/guqin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STRING_COUNT, HUI_POSITIONS, huiToPosition, nearestHui } from './guqin';

describe('guqin constants', () => {
  it('has seven strings', () => {
    expect(STRING_COUNT).toBe(7);
  });

  it('has thirteen hui, the 7th at the string midpoint', () => {
    expect(HUI_POSITIONS).toHaveLength(13);
    expect(HUI_POSITIONS[6]).toBeCloseTo(0.5, 5); // 七徽 (index 6) = 1/2
    expect(HUI_POSITIONS[0]).toBeCloseTo(0.125, 5); // 一徽 = 1/8
    expect(HUI_POSITIONS[12]).toBeCloseTo(0.875, 5); // 十三徽 = 7/8
  });

  it('huiToPosition maps hui number (1-13) to normalized position', () => {
    expect(huiToPosition(7)).toBeCloseTo(0.5, 5);
    expect(huiToPosition(1)).toBeCloseTo(0.125, 5);
  });

  it('nearestHui finds the closest hui to a normalized position', () => {
    expect(nearestHui(0.49)).toBe(7);
    expect(nearestHui(0.13)).toBe(1);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test src/model/guqin.test.ts`
Expected: FAIL,找不到模組 `./guqin`。

- [ ] **Step 3: 實作 guqin.ts**

Create `src/model/guqin.ts`:

```ts
export const STRING_COUNT = 7;

// 十三徽在弦上的正規化位置(0 = 岳山/彈弦端, 1 = 龍齦端)。
// 對應泛音節點:1/8, 1/6, 1/5, 1/4, 1/3, 2/5, 1/2, 3/5, 2/3, 3/4, 4/5, 5/6, 7/8
export const HUI_POSITIONS: readonly number[] = [
  1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 2 / 5, 1 / 2,
  3 / 5, 2 / 3, 3 / 4, 4 / 5, 5 / 6, 7 / 8,
];

/** hui 編號 1..13 → 正規化位置 0..1 */
export function huiToPosition(hui: number): number {
  return HUI_POSITIONS[hui - 1];
}

/** 正規化位置 → 最接近的 hui 編號 1..13 */
export function nearestHui(position: number): number {
  let best = 1;
  let bestDist = Infinity;
  HUI_POSITIONS.forEach((p, i) => {
    const d = Math.abs(p - position);
    if (d < bestDist) {
      bestDist = d;
      best = i + 1;
    }
  });
  return best;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/model/guqin.test.ts`
Expected: PASS,4 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/model/guqin.ts src/model/guqin.test.ts
git commit -m "feat: add guqin constants and hui/position conversion"
```

---

## Task 3: 資料型別與音事件建立(TDD)

**Files:**
- Create: `src/model/types.ts`, `src/model/notes.ts`, `src/model/notes.test.ts`

- [ ] **Step 1: 定義型別**

Create `src/model/types.ts`:

```ts
export type NoteType = 'san' | 'fan' | 'an'; // 散音 / 泛音 / 按音

export interface EnvelopePoint { t: number; level: number; }   // t: 相對音起點秒數, level: 0..1
export interface SlidePoint    { t: number; position: number; } // t: 相對秒數, position: 0..1

export interface Note {
  id: string;
  startTime: number;            // 音樂中的絕對時間(秒)
  string: number;               // 1..7
  type: NoteType;
  position: number | null;      // 弦上彈奏點 0..1;散音為 null(整弦)
  hui?: number;                 // 泛音專用 1..13
  adsr: EnvelopePoint[];
  slide?: SlidePoint[];         // 走手音(僅按音)
  jianzipu?: string;            // 預留減字譜欄位
  color?: string;
}

export interface Project {
  version: string;
  audio: { fileName: string; durationSec: number; sampleRate: number };
  notes: Note[];
  meta?: { title?: string; tuning?: number[] };
}

export const PROJECT_VERSION = '1';
```

- [ ] **Step 2: 寫失敗測試**

Create `src/model/notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createNote, DEFAULT_ADSR } from './notes';

describe('createNote', () => {
  it('creates a san (open string) note with a unique id and default ADSR', () => {
    const a = createNote({ startTime: 1.5, string: 3, type: 'san', position: null });
    const b = createNote({ startTime: 1.5, string: 3, type: 'san', position: null });
    expect(a.id).not.toBe(b.id);
    expect(a.startTime).toBe(1.5);
    expect(a.string).toBe(3);
    expect(a.type).toBe('san');
    expect(a.position).toBeNull();
    expect(a.adsr).toEqual(DEFAULT_ADSR);
  });

  it('creates an an (stopped) note keeping its position', () => {
    const n = createNote({ startTime: 2, string: 1, type: 'an', position: 0.5 });
    expect(n.position).toBe(0.5);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test src/model/notes.test.ts`
Expected: FAIL,找不到 `./notes`。

- [ ] **Step 4: 實作 notes.ts**

Create `src/model/notes.ts`:

```ts
import { Note, NoteType, EnvelopePoint } from './types';

// 預設 ADSR:快起音、衰減到延音、結束釋放(相對秒數, 亮度 0..1)
export const DEFAULT_ADSR: EnvelopePoint[] = [
  { t: 0,    level: 0 },
  { t: 0.05, level: 1 },
  { t: 0.3,  level: 0.6 },
  { t: 1.0,  level: 0.5 },
  { t: 1.5,  level: 0 },
];

let counter = 0;
export function uid(): string {
  counter += 1;
  return `n_${Date.now().toString(36)}_${counter}`;
}

export function createNote(input: {
  startTime: number;
  string: number;
  type: NoteType;
  position: number | null;
  hui?: number;
}): Note {
  return {
    id: uid(),
    startTime: input.startTime,
    string: input.string,
    type: input.type,
    position: input.position,
    hui: input.hui,
    adsr: DEFAULT_ADSR.map((p) => ({ ...p })),
  };
}
```

> 註:測試用 `toEqual(DEFAULT_ADSR)` 比較值相等(深拷貝後值仍相等),故通過。

- [ ] **Step 5: 執行測試確認通過**

Run: `npm test src/model/notes.test.ts`
Expected: PASS,2 個測試通過。

- [ ] **Step 6: 提交**

```bash
git add src/model/types.ts src/model/notes.ts src/model/notes.test.ts
git commit -m "feat: add data model types and createNote"
```

---

## Task 4: 序列化 round-trip(TDD)

**Files:**
- Create: `src/model/serialize.ts`, `src/model/serialize.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/model/serialize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from './serialize';
import { createNote } from './notes';
import { Project, PROJECT_VERSION } from './types';

function sampleProject(): Project {
  return {
    version: PROJECT_VERSION,
    audio: { fileName: 'demo.mp3', durationSec: 42, sampleRate: 44100 },
    notes: [
      createNote({ startTime: 1, string: 1, type: 'san', position: null }),
      createNote({ startTime: 2, string: 4, type: 'an', position: 0.5 }),
    ],
  };
}

describe('serialize round-trip', () => {
  it('serializes then deserializes to an equal project', () => {
    const p = sampleProject();
    const json = serializeProject(p);
    const back = deserializeProject(json);
    expect(back).toEqual(p);
  });

  it('rejects JSON with a wrong/missing version', () => {
    expect(() => deserializeProject('{"notes":[]}')).toThrow();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test src/model/serialize.test.ts`
Expected: FAIL,找不到 `./serialize`。

- [ ] **Step 3: 實作 serialize.ts**

Create `src/model/serialize.ts`:

```ts
import { Project, PROJECT_VERSION } from './types';

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Project {
  const obj = JSON.parse(json) as Partial<Project>;
  if (obj.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${obj.version}`);
  }
  if (!obj.audio || !Array.isArray(obj.notes)) {
    throw new Error('Malformed project: missing audio or notes');
  }
  return obj as Project;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/model/serialize.test.ts`
Expected: PASS,2 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/model/serialize.ts src/model/serialize.test.ts
git commit -m "feat: add project JSON serialize/deserialize with round-trip"
```

---

## Task 5: Zustand 狀態 store

**Files:**
- Create: `src/state/store.ts`, `src/state/store.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/state/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { createNote } from '../model/notes';

describe('store', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('adds and removes notes', () => {
    const n = createNote({ startTime: 1, string: 2, type: 'san', position: null });
    useStore.getState().addNote(n);
    expect(useStore.getState().notes).toHaveLength(1);
    useStore.getState().removeNote(n.id);
    expect(useStore.getState().notes).toHaveLength(0);
  });

  it('selects a note', () => {
    const n = createNote({ startTime: 1, string: 2, type: 'san', position: null });
    useStore.getState().addNote(n);
    useStore.getState().selectNote(n.id);
    expect(useStore.getState().selectedId).toBe(n.id);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test src/state/store.test.ts`
Expected: FAIL,找不到 `./store`。

- [ ] **Step 3: 實作 store.ts**

Create `src/state/store.ts`:

```ts
import { create } from 'zustand';
import { Note, Project } from '../model/types';

interface AudioMeta { fileName: string; durationSec: number; sampleRate: number; }

interface AppState {
  notes: Note[];
  selectedId: string | null;
  audio: AudioMeta | null;
  currentTime: number;
  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  setAudio: (a: AudioMeta) => void;
  setCurrentTime: (t: number) => void;
  loadProject: (p: Project) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  notes: [],
  selectedId: null,
  audio: null,
  currentTime: 0,
  addNote: (n) => set((s) => ({ notes: [...s.notes, n] })),
  removeNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectNote: (id) => set({ selectedId: id }),
  setAudio: (a) => set({ audio: a }),
  setCurrentTime: (t) => set({ currentTime: t }),
  loadProject: (p) => set({ notes: p.notes, audio: p.audio, selectedId: null }),
  reset: () => set({ notes: [], selectedId: null, audio: null, currentTime: 0 }),
}));
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/state/store.test.ts`
Expected: PASS,2 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/state/store.ts src/state/store.test.ts
git commit -m "feat: add zustand app store for notes and audio meta"
```

---

## Task 6: 音訊引擎(Web Audio 封裝)

> Web Audio 在 jsdom 無法真正解碼,因此本任務以**手動執行驗證**為主,僅對純介面做最小檢查。

**Files:**
- Create: `src/audio/AudioEngine.ts`

- [ ] **Step 1: 實作 AudioEngine.ts**

Create `src/audio/AudioEngine.ts`:

```ts
/**
 * 封裝 Web Audio:載入並解碼音檔、播放/暫停、提供精確的播放時間。
 * 時鐘以 AudioContext.currentTime 為基準,避免 setInterval 漂移。
 */
export class AudioEngine {
  private ctx = new AudioContext();
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtCtxTime = 0; // 開始播放時的 ctx.currentTime
  private startOffset = 0;      // 從音檔的哪個位置開始(秒)
  private playing = false;

  async loadFile(file: File): Promise<{ durationSec: number; sampleRate: number }> {
    const arrayBuf = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuf);
    this.startOffset = 0;
    return { durationSec: this.buffer.duration, sampleRate: this.buffer.sampleRate };
  }

  play(): void {
    if (!this.buffer || this.playing) return;
    this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.ctx.destination);
    src.start(0, this.startOffset);
    this.source = src;
    this.startedAtCtxTime = this.ctx.currentTime;
    this.playing = true;
    src.onended = () => { if (this.playing) this.pause(); };
  }

  pause(): void {
    if (!this.playing) return;
    this.startOffset = this.getTime();
    this.source?.stop();
    this.source = null;
    this.playing = false;
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.startOffset = Math.max(0, seconds);
    if (wasPlaying) this.play();
  }

  /** 目前播放位置(秒),樣本級精確 */
  getTime(): number {
    if (!this.playing) return this.startOffset;
    return this.startOffset + (this.ctx.currentTime - this.startedAtCtxTime);
  }

  isPlaying(): boolean { return this.playing; }
  get duration(): number { return this.buffer?.duration ?? 0; }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/audio/AudioEngine.ts
git commit -m "feat: add AudioEngine wrapping Web Audio playback and clock"
```

> 此引擎的播放/時鐘正確性將在 Task 7 接上 UI 後以手動執行驗證。

---

## Task 7: 播放列元件 TransportBar

**Files:**
- Create: `src/components/TransportBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 TransportBar.tsx**

Create `src/components/TransportBar.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { useStore } from '../state/store';

export const engine = new AudioEngine();

export function TransportBar() {
  const setAudio = useStore((s) => s.setAudio);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const audio = useStore((s) => s.audio);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setCurrentTime(engine.getTime());
      setPlaying(engine.isPlaying());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [setCurrentTime]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const meta = await engine.loadFile(file);
    setAudio({ fileName: file.name, ...meta });
  }

  return (
    <div className="transport">
      <input type="file" accept="audio/*" onChange={onFile} />
      <button onClick={() => (playing ? engine.pause() : engine.play())}>
        {playing ? '⏸ 暫停' : '▶ 播放'}
      </button>
      <span>
        {useStore.getState().currentTime.toFixed(2)}s / {audio?.durationSec.toFixed(2) ?? '0'}s
      </span>
      {audio && <span> — {audio.fileName}</span>}
    </div>
  );
}
```

- [ ] **Step 2: 在 App.tsx 掛上 TransportBar**

Replace `src/App.tsx` 內容:

```tsx
import { TransportBar } from './components/TransportBar';

export default function App() {
  return (
    <div>
      <h1>古琴聲光秀 編輯器</h1>
      <TransportBar />
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`,開啟 http://localhost:5173。
Expected:選一個 mp3/wav → 顯示檔名與總長 → 按播放會聽到聲音、時間數字遞增、按暫停會停住且時間凍結。耳朵與數字大致同步。

- [ ] **Step 4: 提交**

```bash
git add src/components/TransportBar.tsx src/App.tsx
git commit -m "feat: add TransportBar with audio load, play/pause, live time"
```

---

## Task 8: 古琴畫布 GuqinCanvas(繪製 + 點擊建立音)

**Files:**
- Create: `src/components/GuqinCanvas.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 GuqinCanvas.tsx**

Create `src/components/GuqinCanvas.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import { STRING_COUNT, HUI_POSITIONS } from '../model/guqin';
import { useStore } from '../state/store';
import { createNote } from '../model/notes';

const W = 960;
const H = 280;
const PAD_X = 40;
const PAD_Y = 30;

function stringY(stringIndex: number): number {
  // stringIndex 0..6 → 由上到下
  const usable = H - PAD_Y * 2;
  return PAD_Y + (usable * stringIndex) / (STRING_COUNT - 1);
}

function positionX(pos: number): number {
  return PAD_X + (W - PAD_X * 2) * pos;
}

export function GuqinCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    // 七弦
    ctx.strokeStyle = '#c8a96a';
    ctx.lineWidth = 2;
    for (let i = 0; i < STRING_COUNT; i++) {
      const y = stringY(i);
      ctx.beginPath();
      ctx.moveTo(PAD_X, y);
      ctx.lineTo(W - PAD_X, y);
      ctx.stroke();
    }
    // 十三徽(畫在最上方弦上緣的標記)
    ctx.fillStyle = '#eee';
    HUI_POSITIONS.forEach((p) => {
      const x = positionX(p);
      ctx.beginPath();
      ctx.arc(x, PAD_Y - 12, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    // 已標記的音(靜態小點,光效在後續里程碑加入)
    ctx.fillStyle = '#ff5';
    notes.forEach((n) => {
      const y = stringY(n.string - 1);
      const x = positionX(n.position ?? 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [notes]);

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = ref.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // 找最近的弦
    let stringIndex = 0;
    let best = Infinity;
    for (let i = 0; i < STRING_COUNT; i++) {
      const d = Math.abs(stringY(i) - y);
      if (d < best) { best = d; stringIndex = i; }
    }
    const pos = Math.min(1, Math.max(0, (x - PAD_X) / (W - PAD_X * 2)));
    const note = createNote({
      startTime: useStore.getState().currentTime,
      string: stringIndex + 1,
      type: 'an',
      position: pos,
    });
    addNote(note);
  }

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      onClick={onClick}
      style={{ background: '#1a1a1a', cursor: 'crosshair', display: 'block' }}
    />
  );
}
```

- [ ] **Step 2: 在 App.tsx 掛上 GuqinCanvas**

Update `src/App.tsx`:

```tsx
import { TransportBar } from './components/TransportBar';
import { GuqinCanvas } from './components/GuqinCanvas';

export default function App() {
  return (
    <div>
      <h1>古琴聲光秀 編輯器</h1>
      <TransportBar />
      <GuqinCanvas />
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:看到七條弦、上緣十三個徽點;播放音檔到某時間點,在某條弦的某位置點擊 → 該處出現一個黃點,且其對應的弦/位置正確。

- [ ] **Step 4: 提交**

```bash
git add src/components/GuqinCanvas.tsx src/App.tsx
git commit -m "feat: render guqin (7 strings, 13 hui) and click to create notes"
```

---

## Task 9: 時間軸 Timeline(列出/選取/刪除)

**Files:**
- Create: `src/components/Timeline.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 Timeline.tsx**

Create `src/components/Timeline.tsx`:

```tsx
import { useStore } from '../state/store';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };

export function Timeline() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const selectNote = useStore((s) => s.selectNote);
  const removeNote = useStore((s) => s.removeNote);

  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="timeline">
      <h3>音清單({notes.length})</h3>
      <ul>
        {sorted.map((n) => (
          <li
            key={n.id}
            onClick={() => selectNote(n.id)}
            style={{ fontWeight: n.id === selectedId ? 'bold' : 'normal' }}
          >
            {n.startTime.toFixed(2)}s — 第{n.string}弦 — {TYPE_LABEL[n.type]}
            {n.position !== null && ` @ ${n.position.toFixed(2)}`}
            <button onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}>刪除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: 在 App.tsx 掛上 Timeline**

Update `src/App.tsx` 加入 `import { Timeline } from './components/Timeline';` 並在 `<GuqinCanvas />` 之後加 `<Timeline />`。

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:建立幾個音後,清單依時間排序顯示;點某項會粗體選取;按刪除會從清單與畫布同時消失。

- [ ] **Step 4: 提交**

```bash
git add src/components/Timeline.tsx src/App.tsx
git commit -m "feat: add Timeline list with select and delete"
```

---

## Task 10: 匯出/匯入面板 ExportPanel

**Files:**
- Create: `src/components/ExportPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 ExportPanel.tsx**

Create `src/components/ExportPanel.tsx`:

```tsx
import { useStore } from '../state/store';
import { serializeProject, deserializeProject } from '../model/serialize';
import { PROJECT_VERSION, Project } from '../model/types';

export function ExportPanel() {
  const notes = useStore((s) => s.notes);
  const audio = useStore((s) => s.audio);
  const loadProject = useStore((s) => s.loadProject);

  function onExport() {
    const project: Project = {
      version: PROJECT_VERSION,
      audio: audio ?? { fileName: '', durationSec: 0, sampleRate: 0 },
      notes,
    };
    const blob = new Blob([serializeProject(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audio?.fileName ?? 'guqin'}.guqin.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      loadProject(deserializeProject(text));
    } catch (err) {
      alert(`匯入失敗:${(err as Error).message}`);
    }
  }

  return (
    <div className="export">
      <button onClick={onExport}>匯出 JSON</button>
      <input type="file" accept="application/json,.json" onChange={onImport} />
    </div>
  );
}
```

- [ ] **Step 2: 在 App.tsx 掛上 ExportPanel**

Update `src/App.tsx` 加入 `import { ExportPanel } from './components/ExportPanel';` 並在 `<Timeline />` 之後加 `<ExportPanel />`。

- [ ] **Step 3: 手動驗證 round-trip**

Run: `npm run dev`
Expected:建立數個音 → 匯出 JSON(下載一個 `.guqin.json`)→ 重新整理頁面 → 匯入剛才的檔案 → 音清單與畫布上的點與匯出前一致。

- [ ] **Step 4: 全套測試與提交**

Run: `npm test`
Expected:所有單元測試 PASS。

```bash
git add src/components/ExportPanel.tsx src/App.tsx
git commit -m "feat: add ExportPanel for JSON export/import round-trip"
```

---

## 驗收(本切片完成的定義)

- `npm test` 全綠(guqin、notes、serialize、store 的單元測試)。
- `npm run dev` 後可:載入音檔並播放/暫停、時間與聲音同步;畫布顯示七弦十三徽;播放中點擊建立音且弦/位置正確;Timeline 可選取/刪除;匯出後重新匯入畫面一致(round-trip 無損)。

## 下一份計畫(本切片之後)

依高層計畫 `C:\Users\User\.claude\plans\md-lucky-clarke.md` 的里程碑:
- 音色三型切換 + 泛音限徽位 + 按音按點(擴充 NoteInspector)
- ADSR 曲線編輯器(SVG 控制點)
- 即時光帶特效(GuqinCanvas 隨時鐘渲染亮度/位置)
- 走手音軌跡編輯器 + 虛音渲染
- 減字譜欄位 UI、自動存檔、undo/redo、播放速度、量化

每項在本地基跑通後各自立計畫。
