# 古琴聲光秀 第一步 — 地基切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **2026-07-04 更新**:依高層計畫 `計畫─第一步.md` 最新版本同步以下架構決策,取代原本單一 `GuqinCanvas` 元件的設計:
> 1. 介面拆成**工作區**(`PositionStrip` 抽象弦線輸入)與**展示區**(`GuqinDisplay` 讀取專案根目錄的 `guqin-vector.svg` 寫實渲染),互不相依。
> 2. 音事件建立改為**鍵盤快捷鍵優先**:`S`/`F`/`A` 插入只帶 `type`+`startTime` 的占位音,`string`/`position`/`hui` 留空待補,而非滑鼠一次點擊決定全部欄位。
> 3. `Note.string`/`position`/`hui` 改為可選,新增 `huiNotation` 保存徽分記法原文(如 `"7.6"`)。
> 4. `HUI_POSITIONS` 改由 `guqin-vector.svg` 內十三個徽記號的實際座標換算,取代原本手寫的諧音分數近似值。
>
> **2026-07-04 二次更新**:對齊 `施作注意事項.md` 的定案與已修正錯誤(座標基準 `X1=363`、`setNotePosition`、店層例外處理等已直接改在下方各 Task 內容,不再另行列出);另外把兩項此前遺漏的定案補進 Task 2 與 Task 8:(a)`parseHuiNotation` 開放 `13.1`–`13.9` 內插到龍齦,支援徽外按音;(b)新增 `StatusBar` 元件與 store 的 `editBuffer`,讓快捷鍵輸入緩衝可見,不再盲打。

**Goal:** 建立一個可執行的最小古琴聲光秀編輯器:能匯入音檔並播放、用鍵盤快捷鍵在當前時間建立音事件、在工作區用滑鼠或數字鍵設定位置/徽位、在展示區的寫實古琴圖上看到對應標記、在時間軸檢視/刪除、並能將整個專案匯出/匯入 JSON 且 round-trip 無損。

**Architecture:** React + TypeScript + Vite 單頁應用。純邏輯(資料模型、古琴常數、序列化)抽到 `src/model/` 並以 Vitest 做 TDD;狀態用 Zustand 集中於 `src/state/store.ts`;音訊封裝在 `src/audio/AudioEngine.ts`(Web Audio API 提供精確時鐘);UI 分**工作區**(`TransportBar`、`PositionStrip`、`Timeline`)與**展示區**(`GuqinDisplay`)。Canvas/SVG 與音訊的視覺/聽覺行為以手動執行 dev server 驗證,可測的純邏輯一律先寫測試。

**Tech Stack:** React 18, TypeScript, Vite, Vitest + jsdom, Zustand, Web Audio API, Canvas 2D + 內嵌 SVG。

---

## File Structure

| 檔案 | 職責 |
|------|------|
| `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` / `src/main.tsx` / `src/App.tsx` | 專案骨架與進入點 |
| `public/guqin-vector.svg` | 展示區底圖(從專案根目錄的 `guqin-vector.svg` 移入,Vite 靜態資源慣例) |
| `src/model/types.ts` | 資料型別:`Project` `Note` `EnvelopePoint` `SlidePoint` `NoteType` |
| `src/model/guqin.ts` | 古琴常數:弦數、十三徽正規化位置(由 `guqin-vector.svg` 座標換算)、`position↔hui` 換算、徽分記法解析 |
| `src/model/notes.ts` | `createPlaceholderNote`、預設 ADSR、`uid` |
| `src/model/serialize.ts` | `serializeProject` / `deserializeProject`(round-trip) |
| `src/state/store.ts` | Zustand store:notes 增刪選取、目前編輯欄位、目前時間、音檔 meta |
| `src/audio/AudioEngine.ts` | Web Audio:載入解碼、播放/暫停、`getTime()` |
| `src/components/TransportBar.tsx` | 載入音檔、播放/暫停、時間顯示 |
| `src/hooks/useGlobalShortcuts.ts` | 全域鍵盤快捷鍵:`Space`/`←→`/`↑↓`/`S``F``A`/`Tab`/數字鍵/`Enter``Esc``Backspace` |
| `src/components/PositionStrip.tsx`(工作區) | 畫抽象弦線 + 十三徽記號;點擊設定選中音的 `position`/`hui` |
| `src/components/GuqinDisplay.tsx`(展示區) | 讀取 `guqin-vector.svg`,依 `notes` 在對應弦上疊加標記 |
| `src/components/Timeline.tsx` | 列出所有音(含未完成占位音)、選取、刪除 |
| `src/components/ExportPanel.tsx` | 匯出/匯入 JSON |
| `src/model/*.test.ts` | 純邏輯單元測試 |

設計原則:`src/model/` 內全為**無副作用的純函式**,可在 jsdom 外獨立測試;UI 元件只讀寫 store,不持有業務邏輯。

---

## Task 1: 專案骨架與測試環境

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: 用 Vite 建立 React + TS 專案骨架**

在專案根目錄執行:

```bash
npm create vite@latest . -- --template react-ts
```

若目錄非空而中止,改為先在暫存資料夾建立再複製,或手動建立以下檔案。**注意**:根目錄已有 `guqin-vector.svg`、`計畫─第一步.md`、`計畫草稿.md`,建立時不要覆蓋或刪除它們。

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

- [ ] **Step 6: 把 `guqin-vector.svg` 移到 `public/`**

```bash
mkdir -p public
cp guqin-vector.svg public/guqin-vector.svg
```

保留根目錄原檔(規劃文件仍會參照它),`public/` 內的副本才是實際被 App 讀取的資源。

- [ ] **Step 7: 刪除 sanity 測試並提交**

刪除 `src/model/sanity.test.ts`。

**注意**:repo 已存在(目前分支 `main`,已有先前的規劃文件提交紀錄),不需要也不應該 `git init`;直接加入變更並提交即可。

```bash
git add -A
git commit -m "chore: scaffold Vite React TS project with Vitest"
```

---

## Task 2: 古琴常數與位置換算(TDD)

**Files:**
- Create: `src/model/guqin.ts`, `src/model/guqin.test.ts`

`HUI_POSITIONS` 採古琴傳統的**理論徽位**:岳山到龍齦(弦末段)之間的簡單整數比,而非由 `guqin-vector.svg` 的 `<circle>` 座標反推——先前版本曾以 `position = (379 - cx) / (379 - (-22))` 由畫面座標反推,但弦線在 SVG 中略帶弧度,x 軸投影並非等比例,反推值僅為近似(例如七徽算出 0.5150,但七徽理論上就是弦正中點 0.5)。`guqin-vector.svg` 的十三個徽記號座標已重新調整,使其視覺上盡量貼近下列理論比例;`position=0` 為岳山/彈弦端,`position=1` 為龍齦端:

| hui | 理論比例 | position |
|---|---|---|
| 1 | 1/8 | 0.1250 |
| 2 | 1/6 | 0.1667 |
| 3 | 1/5 | 0.2000 |
| 4 | 1/4 | 0.2500 |
| 5 | 1/3 | 0.3333 |
| 6 | 2/5 | 0.4000 |
| 7 | 1/2 | 0.5000 |
| 8 | 3/5 | 0.6000 |
| 9 | 2/3 | 0.6667 |
| 10 | 3/4 | 0.7500 |
| 11 | 4/5 | 0.8000 |
| 12 | 5/6 | 0.8333 |
| 13 | 7/8 | 0.8750 |

**徽外按音(2026-07-04 定案,見 `施作注意事項.md` B6)**:實際琴曲會用到十三徽以外、靠龍齦側的按音。`parseHuiNotation` 對徽號 13 額外允許 `.1`–`.9` 的小數位,內插到龍齦(`position=1`,視為虛擬的「第十四徽」),不再對此拋出例外;1–12 徽的小數位仍內插到下一個實際徽位。泛音不受此影響,依然限整數徽位 1–13(store 層另有檢查,見 Task 5)。

- [ ] **Step 1: 寫失敗測試**

Create `src/model/guqin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  STRING_COUNT, HUI_POSITIONS, huiToPosition, nearestHui, parseHuiNotation,
} from './guqin';

describe('guqin constants', () => {
  it('has seven strings and thirteen hui', () => {
    expect(STRING_COUNT).toBe(7);
    expect(HUI_POSITIONS).toHaveLength(13);
  });

  it('matches theoretical hui ratios (岳山到龍齦的簡單整數比)', () => {
    expect(HUI_POSITIONS[0]).toBeCloseTo(1 / 8, 5);   // 一徽
    expect(HUI_POSITIONS[6]).toBeCloseTo(1 / 2, 5);   // 七徽,弦正中點
    expect(HUI_POSITIONS[12]).toBeCloseTo(7 / 8, 5);  // 十三徽
  });

  it('huiToPosition maps hui number (1-13) to normalized position', () => {
    expect(huiToPosition(7)).toBeCloseTo(0.5, 5);
    expect(huiToPosition(1)).toBeCloseTo(0.125, 5);
  });

  it('nearestHui finds the closest hui to a normalized position', () => {
    expect(nearestHui(0.52)).toBe(7);
    // 0.15 與二徽(1/6≈0.1667,距離≈0.0167)比一徽(1/8=0.125,距離0.025)更近,故最近徽位是 2。
    expect(nearestHui(0.15)).toBe(2);
  });

  it('parseHuiNotation converts "N.f" hui-fen notation to normalized position', () => {
    // 7.6 = 第七徽往第八徽方向走十分之六
    const expected = HUI_POSITIONS[6] + 0.6 * (HUI_POSITIONS[7] - HUI_POSITIONS[6]);
    expect(parseHuiNotation('7.6')).toBeCloseTo(expected, 5);
    expect(parseHuiNotation('7')).toBeCloseTo(HUI_POSITIONS[6], 5);
    expect(parseHuiNotation('7.0')).toBeCloseTo(HUI_POSITIONS[6], 5);
  });

  it('parseHuiNotation extends beyond the 13th hui towards 龍齦(position=1),供徽外按音使用', () => {
    // 13.5 = 十三徽往龍齦(position=1,視為虛擬的「第十四徽」)方向走十分之五
    const expected13 = HUI_POSITIONS[12] + 0.5 * (1 - HUI_POSITIONS[12]);
    expect(parseHuiNotation('13.5')).toBeCloseTo(expected13, 5);
    expect(parseHuiNotation('13.9')).toBeLessThan(1);
    expect(parseHuiNotation('13.9')).toBeGreaterThan(HUI_POSITIONS[12]);
  });

  it('parseHuiNotation throws on out-of-range hui', () => {
    expect(() => parseHuiNotation('14.5')).toThrow();
    expect(() => parseHuiNotation('0.5')).toThrow();
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
// 採古琴傳統理論徽位:岳山到龍齦的簡單整數比(見本檔案所屬計畫文件的對照表),
// 七徽 = 1/2 恰為弦正中點。guqin-vector.svg 的徽記號座標已調整為視覺上貼近此比例。
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

/**
 * 解析古琴傳統徽分記法 "N.f"(N=徽號 1-13, f=0-9 十分位),
 * 例如 "7.6" = 第七徽往第八徽方向走十分之六。整數(如 "7")視為 "7.0"。
 * 在 HUI_POSITIONS[N] 與 HUI_POSITIONS[N+1] 之間依 f/10 線性內插。
 *
 * 徽外按音(2026-07-04 定案):徽號 13 的小數位內插到龍齦(position=1,
 * 視為虛擬的「第十四徽」),不再視為超出範圍。
 */
export function parseHuiNotation(notation: string): number {
  const match = /^(\d{1,2})(?:\.(\d))?$/.exec(notation.trim());
  if (!match) throw new Error(`Invalid hui notation: "${notation}"`);
  const hui = Number(match[1]);
  const tenth = match[2] ? Number(match[2]) : 0;
  if (hui < 1 || hui > 13) throw new Error(`Hui out of range 1-13: "${notation}"`);
  const base = HUI_POSITIONS[hui - 1];
  if (tenth === 0) return base;
  const next = hui === 13 ? 1 : HUI_POSITIONS[hui]; // 13 徽外插到龍齦(1),其餘為 hui+1 的位置
  return base + (tenth / 10) * (next - base);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/model/guqin.test.ts`
Expected: PASS,7 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/model/guqin.ts src/model/guqin.test.ts
git commit -m "feat: add guqin constants and hui-fen notation derived from guqin-vector.svg"
```

---

## Task 3: 資料型別與占位音建立(TDD)

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
  string?: 1|2|3|4|5|6|7;        // 哪一條弦;快捷鍵插入的占位音尚未指定時為 undefined
  type: NoteType;
  huiNotation?: string;          // 使用者輸入的徽分記法原文,如 "7.6"(泛音/按音用)
  position?: number;             // 弦上彈奏點,正規化 0..1;按音由 huiNotation 換算而來
  hui?: number;                  // 泛音專用整數徽位,由 huiNotation 換算而來
  adsr: EnvelopePoint[];
  slide?: SlidePoint[];          // 走手音(僅按音)
  jianzipu?: string;             // 預留減字譜欄位
  color?: string;
}

/** 一個音是否已可在展示區渲染:散音只需弦號,泛音/按音還需位置資訊 */
export function isNoteComplete(note: Note): boolean {
  if (note.string === undefined) return false;
  if (note.type === 'san') return true;
  return note.position !== undefined;
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
import { createPlaceholderNote, DEFAULT_ADSR } from './notes';
import { isNoteComplete } from './types';

describe('createPlaceholderNote', () => {
  it('creates a note with only startTime/type set, string/position left undefined', () => {
    const a = createPlaceholderNote({ startTime: 1.5, type: 'san' });
    const b = createPlaceholderNote({ startTime: 1.5, type: 'san' });
    expect(a.id).not.toBe(b.id);
    expect(a.startTime).toBe(1.5);
    expect(a.type).toBe('san');
    expect(a.string).toBeUndefined();
    expect(a.position).toBeUndefined();
    expect(a.adsr).toEqual(DEFAULT_ADSR);
    expect(isNoteComplete(a)).toBe(false); // 未指定弦號,視為未完成
  });

  it('a san note is complete once a string is assigned', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    n.string = 3;
    expect(isNoteComplete(n)).toBe(true); // 散音不需要 position
  });

  it('an an/fan note additionally needs a position to be complete', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    n.string = 3;
    expect(isNoteComplete(n)).toBe(false);
    n.position = 0.5;
    expect(isNoteComplete(n)).toBe(true);
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

/** 鍵盤快捷鍵(S/F/A)建立的占位音:只帶時間與音色型別,其餘欄位待補 */
export function createPlaceholderNote(input: { startTime: number; type: NoteType }): Note {
  return {
    id: uid(),
    startTime: input.startTime,
    type: input.type,
    adsr: DEFAULT_ADSR.map((p) => ({ ...p })),
  };
}
```

> 註:測試用 `toEqual(DEFAULT_ADSR)` 比較值相等(深拷貝後值仍相等),故通過。

- [ ] **Step 5: 執行測試確認通過**

Run: `npm test src/model/notes.test.ts`
Expected: PASS,3 個測試通過。

- [ ] **Step 6: 提交**

```bash
git add src/model/types.ts src/model/notes.ts src/model/notes.test.ts
git commit -m "feat: add data model with optional string/position and placeholder notes"
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test src/model/serialize.test.ts`
Expected: FAIL,找不到 `./serialize`。

- [ ] **Step 3: 實作 serialize.ts**

Create `src/model/serialize.ts`:

```ts
import { Project, PROJECT_VERSION, NoteType } from './types';

const VALID_NOTE_TYPES: readonly NoteType[] = ['san', 'fan', 'an'];

/** 對單一 note 做最小結構驗證,不合法時丟出指出第幾筆的錯誤 */
function assertValidNote(note: unknown, index: number): void {
  if (typeof note !== 'object' || note === null) {
    throw new Error(`Malformed project: note[${index}] is not an object`);
  }
  const n = note as Record<string, unknown>;
  if (typeof n.id !== 'string' || n.id.length === 0) {
    throw new Error(`Malformed project: note[${index}] missing a valid "id"`);
  }
  if (typeof n.startTime !== 'number' || Number.isNaN(n.startTime)) {
    throw new Error(`Malformed project: note[${index}] missing a numeric "startTime"`);
  }
  if (typeof n.type !== 'string' || !VALID_NOTE_TYPES.includes(n.type as NoteType)) {
    throw new Error(`Malformed project: note[${index}] has an invalid "type": ${String(n.type)}`);
  }
  if (!Array.isArray(n.adsr)) {
    throw new Error(`Malformed project: note[${index}] missing an array "adsr"`);
  }
}

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
  obj.notes.forEach((note, i) => assertValidNote(note, i));
  return obj as Project;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/model/serialize.test.ts`
Expected: PASS,3 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/model/serialize.ts src/model/serialize.test.ts
git commit -m "feat: add project JSON serialize/deserialize with round-trip"
```

---

## Task 5: Zustand 狀態 store(含選取欄位與快捷鍵所需的更新動作)

**Files:**
- Create: `src/state/store.ts`, `src/state/store.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `src/state/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { createPlaceholderNote } from '../model/notes';

describe('store', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('adds and removes notes', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    expect(useStore.getState().notes).toHaveLength(1);
    useStore.getState().removeNote(n.id);
    expect(useStore.getState().notes).toHaveLength(0);
  });

  it('selects a note and defaults editing field to string', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    useStore.getState().selectNote(n.id);
    expect(useStore.getState().selectedId).toBe(n.id);
    expect(useStore.getState().editingField).toBe('string');
  });

  it('updates the string field of a note', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'san' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteString(n.id, 4);
    expect(useStore.getState().notes[0].string).toBe(4);
  });

  it('sets position/hui from a hui-fen notation string', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteHuiNotation(n.id, '7.6');
    const updated = useStore.getState().notes[0];
    expect(updated.huiNotation).toBe('7.6');
    expect(updated.position).toBeGreaterThan(0);
  });

  it('setNotePosition writes position directly and clears huiNotation, bypassing hui-fen parsing', () => {
    const n = createPlaceholderNote({ startTime: 1, type: 'an' });
    useStore.getState().addNote(n);
    useStore.getState().setNoteHuiNotation(n.id, '7.6'); // 先給一個徽分記法
    useStore.getState().setNotePosition(n.id, 0.42);      // 按音點擊路徑改走這裡
    const updated = useStore.getState().notes[0];
    expect(updated.position).toBe(0.42);
    expect(updated.huiNotation).toBeUndefined();
  });

  it('rejects a fan note given a hui-fen notation with a nonzero decimal', () => {
    // 泛音只能落在整數徽位;帶小數(如 "7.6")會讓 position 與 hui 互相矛盾。
    const n = createPlaceholderNote({ startTime: 1, type: 'fan' });
    useStore.getState().addNote(n);
    expect(() => useStore.getState().setNoteHuiNotation(n.id, '7.6')).toThrow();
    expect(useStore.getState().notes[0]).toEqual(n); // 失敗時 note 不變
  });

  it('tracks the in-progress keyboard edit buffer for StatusBar display', () => {
    // 2026-07-04 定案(施作注意事項 B7):快捷鍵打字的緩衝字串要能被 UI 訂閱顯示,
    // 不能只存在 useGlobalShortcuts 的 ref 裡。
    useStore.getState().setEditBuffer('7.');
    expect(useStore.getState().editBuffer).toBe('7.');
    useStore.getState().reset();
    expect(useStore.getState().editBuffer).toBe('');
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
import { parseHuiNotation, nearestHui } from '../model/guqin';

interface AudioMeta { fileName: string; durationSec: number; sampleRate: number; }
export type EditingField = 'string' | 'position';

interface AppState {
  notes: Note[];
  selectedId: string | null;
  editingField: EditingField;
  audio: AudioMeta | null;
  currentTime: number;
  // 快捷鍵輸入緩衝字串的鏡射(2026-07-04 定案,見 施作注意事項 B7):
  // useGlobalShortcuts 仍以 ref 為即時邏輯來源(避免每個按鍵都觸發 React 重繪的邏輯判斷延遲),
  // 但每次變動都同步寫回這裡,好讓 StatusBar 能訂閱顯示「編輯中:欄位 = 已輸入字串」。
  editBuffer: string;
  addNote: (n: Note) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  cycleEditingField: () => void;
  setNoteString: (id: string, string: number) => void;
  setNoteHuiNotation: (id: string, notation: string) => void;
  setNotePosition: (id: string, position: number) => void;
  nudgeNoteTime: (id: string, deltaSec: number) => void;
  setAudio: (a: AudioMeta) => void;
  setCurrentTime: (t: number) => void;
  setEditBuffer: (buffer: string) => void;
  loadProject: (p: Project) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  notes: [],
  selectedId: null,
  editingField: 'string',
  audio: null,
  currentTime: 0,
  editBuffer: '',
  addNote: (n) => set((s) => ({ notes: [...s.notes, n] })),
  removeNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectNote: (id) => set({ selectedId: id, editingField: 'string' }),
  cycleEditingField: () =>
    set((s) => ({ editingField: s.editingField === 'string' ? 'position' : 'string' })),
  setNoteString: (id, string) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, string: string as Note['string'] } : n)),
    })),
  setNoteHuiNotation: (id, notation) =>
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.id !== id) return n;
        // 泛音只能落在整數徽位:帶非零小數(如 "7.6")會讓 position 與 hui 互相矛盾,直接拒絕。
        if (n.type === 'fan' && !/^\d{1,2}$/.test(notation.trim())) {
          throw new Error(`泛音只能使用整數徽位,不可帶小數: "${notation}"`);
        }
        const position = parseHuiNotation(notation);
        return {
          ...n,
          huiNotation: notation,
          position,
          hui: n.type === 'fan' ? nearestHui(position) : n.hui,
        };
      }),
    })),
  // 按音在 PositionStrip 上點擊時直接寫入正規化 position,不經過徽分記法解析,
  // 避免把 "0.523" 這種字串塞給 parseHuiNotation 導致丟例外(見 Task 9)。
  setNotePosition: (id, position) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        (n.id === id ? { ...n, position, huiNotation: undefined } : n)),
    })),
  nudgeNoteTime: (id, deltaSec) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, startTime: Math.max(0, n.startTime + deltaSec) } : n),
    })),
  setAudio: (a) => set({ audio: a }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setEditBuffer: (buffer) => set({ editBuffer: buffer }),
  loadProject: (p) => set({ notes: p.notes, audio: p.audio, selectedId: null, editingField: 'string', editBuffer: '' }),
  reset: () => set({ notes: [], selectedId: null, editingField: 'string', audio: null, currentTime: 0, editBuffer: '' }),
}));
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test src/state/store.test.ts`
Expected: PASS,7 個測試通過。

- [ ] **Step 5: 提交**

```bash
git add src/state/store.ts src/state/store.test.ts
git commit -m "feat: add zustand store with editing-field cycling and hui-notation updates"
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
    // stop() 觸發的 onended 是非同步的:seek() 會先 stop() 舊 source 再立刻建立新 source,
    // 若這裡只檢查 this.playing,舊 source 延遲觸發的 onended 會誤判「該暫停了」,
    // 把剛開始播放的新 source 也一併停掉(2026-07-05 修正)。用 this.source === src 確認事件
    // 來自目前正在播放的 source(代表音檔真的自然播完),而非被 seek/pause 換掉的舊 source。
    src.onended = () => { if (this.source === src && this.playing) this.pause(); };
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
  const currentTime = useStore((s) => s.currentTime); // 訂閱式讀取,才會在播放中隨時間重繪
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
        {currentTime.toFixed(2)}s / {audio?.durationSec.toFixed(2) ?? '0'}s
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

## Task 8: 全域鍵盤快捷鍵 `useGlobalShortcuts` + 輸入狀態列 `StatusBar`

依高層計畫 §3.1:`S`/`F`/`A` 插入占位音;`↑`/`↓` 跳選音;`Tab` 切換編輯欄位(弦號/位置);數字鍵在欄位編輯中組成數值(弦號欄位為單一 1-7 數字,位置欄位為徽分記法);`Enter` 確認、`Esc` 取消、`Backspace` 編輯中刪字(2026-07-05 定案:不在編輯中時 Backspace 不刪音,刪除選中音只用 `Delete`);`Space` 播放/暫停;`←`/`→` 與 `Ctrl+←`/`Ctrl+→` 倒退快轉;`Shift+←`/`Shift+→` 與 `Shift+Ctrl+←`/`Shift+Ctrl+→` 微調選中音的 `startTime`。另依 2026-07-04 定案(施作注意事項 B7),輸入緩衝字串要能被 UI 訂閱顯示,本 Task 一併加入 `StatusBar` 元件與 store 的 `editBuffer` 鏡射。

**Files:**
- Create: `src/hooks/useGlobalShortcuts.ts`, `src/hooks/useGlobalShortcuts.test.ts`, `src/hooks/fieldInput.ts`, `src/hooks/fieldInput.test.ts`, `src/components/StatusBar.tsx`
- Modify: `src/App.tsx`, `src/state/store.ts`(`editBuffer` 欄位,見 Task 5)

- [ ] **Step 1: 寫失敗測試(欄位輸入緩衝的純邏輯部分)**

把「數字鍵組字串 → 確認 → 換算」的邏輯抽成可獨立測試的純函式,而非整包塞進 React 事件處理裡。

Create `src/hooks/fieldInput.ts`:

```ts
/** 累積使用者鍵入的數字/小數點,供弦號或徽分記法欄位使用 */
export function appendDigit(buffer: string, key: string, field: 'string' | 'position'): string {
  if (field === 'string') {
    return /^[1-7]$/.test(key) ? key : buffer; // 弦號只接受單一 1-7 數字,不累積
  }
  if (/^[0-9]$/.test(key) || key === '.') return buffer + key;
  return buffer;
}
```

Create `src/hooks/fieldInput.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appendDigit } from './fieldInput';

describe('appendDigit', () => {
  it('string field keeps only the latest single digit 1-7', () => {
    expect(appendDigit('', '4', 'string')).toBe('4');
    expect(appendDigit('4', '9', 'string')).toBe('4'); // 9 不合法,維持原值
  });

  it('position field accumulates digits and a decimal point', () => {
    expect(appendDigit('', '7', 'position')).toBe('7');
    expect(appendDigit('7', '.', 'position')).toBe('7.');
    expect(appendDigit('7.', '6', 'position')).toBe('7.6');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test src/hooks/fieldInput.test.ts`
Expected: FAIL,找不到 `./fieldInput`。

- [ ] **Step 3: 執行測試確認通過(實作已於 Step 1 寫出)**

Run: `npm test src/hooks/fieldInput.test.ts`
Expected: PASS,2 個測試通過。

- [ ] **Step 4: 實作 useGlobalShortcuts.ts(手動驗證,涉及 DOM 事件與播放引擎)**

Create `src/hooks/useGlobalShortcuts.ts`:

```ts
import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { createPlaceholderNote } from '../model/notes';
import { engine } from '../components/TransportBar';
import { appendDigit } from './fieldInput';

const SEEK_STEP = 0.5;
const SEEK_STEP_BIG = 3;
const NUDGE_STEP = 0.01;
const NUDGE_STEP_BIG = 0.1;

export function useGlobalShortcuts() {
  const bufferRef = useRef('');
  // 是否正在編輯欄位緩衝字串:第一個數字鍵按下時設 true,Enter 成功/Esc 取消時設 false,
  // 選取新音或插入新占位音時也重設 false。編輯中時 Backspace 用來刪 buffer 最後一字;
  // 不在編輯中時 Backspace 不做任何事(2026-07-05 定案:刪除選中音只用 Delete,
  // 避免使用者誤按 Backspace 就刪掉整個音)。
  const isEditingRef = useRef(false);

  // 2026-07-04 定案(施作注意事項 B7):輸入緩衝要能被 StatusBar 訂閱顯示,不能只活在 ref 裡。
  // bufferRef 仍是即時邏輯判斷的來源(同步、無 React 重繪延遲),
  // 但每次變動都透過這個小工具函式同步寫回 store 的 editBuffer。
  function setBuffer(value: string) {
    bufferRef.current = value;
    useStore.getState().setEditBuffer(value);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // 按過播放按鈕(取得焦點)後再按 Space,瀏覽器會在 keyup 觸發按鈕原生啟動,
      // 若我們的處理器仍往下走一般流程,會變成「原生啟動 + 這裡的播放切換」各一次。
      // 在最前面單獨攔截這個情況,只切換播放狀態並 preventDefault,阻止按鈕原生啟動。
      if (target.tagName === 'BUTTON' && e.key === ' ') {
        e.preventDefault();
        engine.isPlaying() ? engine.pause() : engine.play();
        return;
      }

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return; // 不干擾原生輸入框(如匯入檔案)

      const { selectedId, editingField, notes } = useStore.getState();
      const selected = notes.find((n) => n.id === selectedId);

      if (e.key === ' ') {
        e.preventDefault();
        engine.isPlaying() ? engine.pause() : engine.play();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const sign = e.key === 'ArrowLeft' ? -1 : 1;
        if (e.shiftKey && selected) {
          e.preventDefault();
          const delta = sign * (e.ctrlKey ? NUDGE_STEP_BIG : NUDGE_STEP);
          useStore.getState().nudgeNoteTime(selected.id, delta);
          return;
        }
        e.preventDefault();
        const step = e.ctrlKey ? SEEK_STEP_BIG : SEEK_STEP;
        engine.seek(Math.max(0, engine.getTime() + sign * step));
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
        if (sorted.length === 0) return;
        const idx = sorted.findIndex((n) => n.id === selectedId);
        const nextIdx = e.key === 'ArrowUp'
          ? Math.max(0, (idx === -1 ? sorted.length : idx) - 1)
          : Math.min(sorted.length - 1, idx + 1);
        useStore.getState().selectNote(sorted[nextIdx].id);
        setBuffer('');
        isEditingRef.current = false;
        engine.seek(sorted[nextIdx].startTime);
        return;
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'f' || e.key === 'F' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const type = { s: 'san', f: 'fan', a: 'an' } as const;
        const note = createPlaceholderNote({ startTime: engine.getTime(), type: type[e.key.toLowerCase() as 's'|'f'|'a'] });
        useStore.getState().addNote(note);
        useStore.getState().selectNote(note.id);
        setBuffer('');
        isEditingRef.current = false;
        return;
      }
      if (!selected) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (selected.type === 'san') return; // 散音無位置欄位可切
        useStore.getState().cycleEditingField();
        setBuffer('');
        return;
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        // 編輯中(isEditingRef.current === true)時 Delete 不刪音,避免跟欄位輸入互相干擾。
        if (!isEditingRef.current) useStore.getState().removeNote(selected.id);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (bufferRef.current === '') return;
        try {
          if (editingField === 'string') {
            useStore.getState().setNoteString(selected.id, Number(bufferRef.current));
          } else {
            useStore.getState().setNoteHuiNotation(selected.id, bufferRef.current);
          }
          setBuffer('');
          isEditingRef.current = false;
        } catch (err) {
          // 欄位格式不合法(如位置欄位打成 "7..6",或泛音打成帶小數的 "7.6")。
          // 保留 buffer 不清空,讓使用者可以繼續修正;不視為編輯結束,isEditingRef 維持 true。
          // TODO: 這個切片先用 console.warn 頂著,之後應改成欄位旁的可見錯誤提示(UI toast/inline message)。
          console.warn(`欄位輸入無法解析,已保留原輸入供修正: ${(err as Error).message}`);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setBuffer('');
        isEditingRef.current = false;
        return;
      }
      if (e.key === 'Backspace') {
        // 一律 preventDefault,避免焦點不在輸入框時瀏覽器把 Backspace 當成「上一頁」。
        e.preventDefault();
        if (isEditingRef.current) {
          setBuffer(bufferRef.current.slice(0, -1));
        }
        // 不在編輯中時 Backspace 不做任何事——刪除選中音只透過 Delete。
        return;
      }
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        isEditingRef.current = true;
        setBuffer(appendDigit(bufferRef.current, e.key, editingField));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
```

- [ ] **Step 5: 在 App.tsx 掛上 hook**

Update `src/App.tsx` 加入 `useGlobalShortcuts();`(於元件內呼叫,不渲染任何內容)。

- [ ] **Step 6: 輸入緩衝可見化 `StatusBar`(2026-07-04 定案,見 施作注意事項 B7)**

快捷鍵打字目前是「盲打」——UI 上完全看不到目前選中音、正在編輯哪個欄位、已經打了什麼字。地基切片就要有一個最小狀態列呈現這些資訊,不等後續的 `NoteInspector`。

Create `src/components/StatusBar.tsx`(2026-07-05 更新:改為在弦號/徽位數字本身用底線標示目前編輯欄位,取代原本附加「— 編輯中:欄位 = 字串」的文字寫法):

```tsx
import { useStore } from '../state/store';

const TYPE_LABEL: Record<string, string> = { san: '散音', fan: '泛音', an: '按音' };

export function StatusBar() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const editBuffer = useStore((s) => s.editBuffer);

  const selected = notes.find((n) => n.id === selectedId);

  if (!selected) {
    return <div className="status-bar">未選中音 — 按 S/F/A 插入散音/泛音/按音</div>;
  }

  // 編輯中時顯示還沒確認的緩衝字串;沒在編輯時顯示已確認的值。
  const stringDisplay = editingField === 'string' && editBuffer !== ''
    ? editBuffer
    : String(selected.string ?? '?');

  const positionDisplay = editingField === 'position' && editBuffer !== ''
    ? editBuffer
    : (selected.huiNotation ?? (selected.position !== undefined ? selected.position.toFixed(2) : '?'));

  return (
    <div className="status-bar">
      選中:{selected.startTime.toFixed(2)}s {TYPE_LABEL[selected.type]}{' '}
      <span style={{ textDecoration: editingField === 'string' ? 'underline' : undefined }}>
        {stringDisplay}
      </span>
      弦
      {selected.type !== 'san' && (
        <>
          {' '}
          <span style={{ textDecoration: editingField === 'position' ? 'underline' : undefined }}>
            {positionDisplay}
          </span>
          徽
        </>
      )}
    </div>
  );
}
```

Update `src/App.tsx` 加入 `import { StatusBar } from './components/StatusBar';` 並在 `<TransportBar />` 之後加 `<StatusBar />`(擺在工作區其他元件之前,隨時可見)。

- [ ] **Step 7: 手動驗證**

Run: `npm run dev`
Expected:載入音檔後按 `Space` 可播放/暫停,即使先前點過播放按鈕、焦點停留在按鈕上也一樣只切換一次(不會雙重觸發);`S`/`F`/`A` 在目前播放時間建立對應型別的占位音並自動選中,狀態列同步顯示「選中:… 散音/泛音/按音 第?弦」(散音不顯示徽位欄位,泛音/按音才顯示);選中音後按數字鍵(如 `3`)時狀態列的弦號數字即時顯示底線與正在輸入的字元,按 `Enter` 確認後底線消失且顯示確認值;`Tab` 切到位置欄位後底線切換到徽位數字下方,輸入 `7.6` 再 `Enter` 確認後設定按點;`Enter` 確認成功後,馬上再按一次 `Backspace` 不會有任何反應(不會刪字也不會刪音,因為此時不在編輯中);位置欄位故意打入不合法字串(如 `7..6`)按 `Enter` 時,主控台會印出警告且輸入保留可繼續修正(狀態列該欄位仍顯示未確認字串與底線),不會拋出未捕捉例外;`Shift+←/→` 能微調選中音的時間;未在編輯欄位時只有 `Delete` 能刪除選中音,`Backspace` 不會刪除選中音。

- [ ] **Step 8: 提交**

```bash
git add src/hooks/ src/components/StatusBar.tsx src/App.tsx
git commit -m "feat: add global keyboard shortcuts, StatusBar, and store-backed edit buffer"
```

---

## Task 9: 工作區 `PositionStrip`(抽象弦線,滑鼠設定位置/徽位)

**Files:**
- Create: `src/components/PositionStrip.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 PositionStrip.tsx**

Create `src/components/PositionStrip.tsx`:

```tsx
import { useRef } from 'react';
import { HUI_POSITIONS, nearestHui } from '../model/guqin';
import { useStore } from '../state/store';

const W = 800;
const H = 60;
const PAD_X = 20;

// position=0(岳山)畫在右邊、position=1(龍齦)畫在左邊,與 GuqinDisplay 的方向一致
// (GuqinDisplay 裡 X1=363/岳山 在較大的 x 座標、視覺上偏右,X2=-22/龍齦偏左)(2026-07-05 修正)。
function positionX(pos: number): number {
  return W - PAD_X - (W - PAD_X * 2) * pos;
}

export function PositionStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const editingField = useStore((s) => s.editingField);
  const setNoteHuiNotation = useStore((s) => s.setNoteHuiNotation);
  const setNotePosition = useStore((s) => s.setNotePosition);

  const selected = notes.find((n) => n.id === selectedId);
  const active = !!selected && selected.type !== 'san' && editingField === 'position';

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!active || !selected) return;
    const rect = ref.current!.getBoundingClientRect();
    // 畫面上左右已反轉(position=0/岳山在右、position=1/龍齦在左),換算滑鼠位置時要對應反過來。
    const raw = 1 - (e.clientX - rect.left - PAD_X) / (rect.width - PAD_X * 2);
    const pos = Math.min(1, Math.max(0, raw));
    if (selected.type === 'fan') {
      // 泛音限整數徽位,走徽分記法解析(nearestHui 保證是合法整數,parseHuiNotation 不會 throw)。
      setNoteHuiNotation(selected.id, String(nearestHui(pos)));
    } else {
      // 按音:pos 是像 0.523 這種連續值,不是合法的徽分記法字串("N.f"),
      // 若丟給 setNoteHuiNotation/parseHuiNotation 會必定 throw。改走 setNotePosition
      // 直接寫入正規化位置,不經徽分解析(見 Task 5 的 setNotePosition)。
      setNotePosition(selected.id, pos);
    }
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: 'relative', width: W, height: H,
        background: active ? '#222' : '#111', opacity: active ? 1 : 0.5,
        cursor: active ? 'pointer' : 'default',
      }}
    >
      <div style={{ position: 'absolute', top: H / 2, left: PAD_X, right: PAD_X, height: 2, background: '#c8a96a' }} />
      {HUI_POSITIONS.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: positionX(p) - 3, top: H / 2 - 3,
          width: 6, height: 6, borderRadius: '50%', background: '#eee',
        }} title={`第${i + 1}徽`} />
      ))}
      {selected?.position !== undefined && (
        <div style={{
          position: 'absolute', left: positionX(selected.position) - 5, top: H / 2 - 5,
          width: 10, height: 10, borderRadius: '50%', background: '#ff5',
        }} />
      )}
    </div>
  );
}
```

> 註:按音點擊直接呼叫 `setNotePosition` 把正規化 `position` 寫入 store,不經過 `parseHuiNotation`/徽分記法解析,因為滑鼠點擊產生的是連續值(如 `0.523`),不符合 `parseHuiNotation` 只接受徽號 1-13 加一位小數的格式,硬塞進去會 throw。這代表按音用滑鼠點擊設定的位置目前**沒有**對應的徽分記法文字(`huiNotation` 會是 `undefined`,Timeline 只能顯示 `position.toFixed(2)`);若要讓按音點擊也能回填精準的徽分記法供顯示/日後編輯用,下一份計畫可加入「正規化位置 → 最近徽分記法字串」的反向換算函式。此為已知簡化,先確保滑鼠路徑不會拋例外、且 `position` 資料正確為優先。

- [ ] **Step 2: 在 App.tsx 掛上 PositionStrip**

Update `src/App.tsx` 加入 `import { PositionStrip } from './components/PositionStrip';` 並在 `<TransportBar />` 之後加 `<PositionStrip />`。

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:未選中音,或選中散音,或編輯欄位不是「位置」時,尺呈現半透明且點擊無效;選中泛音/按音且 `Tab` 切到位置欄位後,點擊尺上任一點會在最近處出現黃點,且吸附到最近徽位(泛音)或該點位置(按音)。

- [ ] **Step 4: 提交**

```bash
git add src/components/PositionStrip.tsx src/App.tsx
git commit -m "feat: add PositionStrip for mouse-driven position/hui editing"
```

---

## Task 10: 展示區 `GuqinDisplay`(讀取 guqin-vector.svg 渲染標記)

**Files:**
- Create: `src/components/GuqinDisplay.tsx`
- Modify: `src/App.tsx`

古琴七弦在 `guqin-vector.svg`(座標系為 `<g transform="translate(45.5,80)">` 內)的端點如下。**注意**:`x1=379` 是畫弦線段本身的視覺端點(靠近岳山木塊外緣),但 `guqin-vector.svg` 上十三個徽記號圓點實際是以 `x=363`(岳山木塊**內緣**)到 `x=-22`(龍齦)這 385 個單位佈徽的——驗證:七徽 `(363-170.78)/385≈0.4993≈1/2`,與 Task 2 的理論徽位 `1/2` 吻合;若誤用 `x1=379` 當 position 換算基準,七徽會算成 `≈0.5410`,導致光點與圖上徽記號圓點水平錯位約 8 個 SVG 單位。因此下方 `markerPoint` 換算的 `position=0` 基準取 `x=363`,而非弦線段本身的 `x1=379`(y 值仍取自弦線兩端點,見下表):

| 弦號 | y1(x=379 處) | y2(x=-22 處) |
|---|---|---|
| 1 | -21.6 | -9 |
| 2 | -14.4 | -6 |
| 3 | -7.2 | -3 |
| 4 | 0 | 0 |
| 5 | 7.2 | 3 |
| 6 | 14.4 | 6 |
| 7 | 21.6 | 9 |

- [ ] **Step 1: 實作 GuqinDisplay.tsx**

Create `src/components/GuqinDisplay.tsx`:

```tsx
import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';
import { HUI_POSITIONS } from '../model/guqin';

// 散音無按點,光點固定放在岳山(position=0)與一徽的中點(2026-07-05 定案),
// 示意「整弦振動」而非某個具體按點,而不是弦正中點。
const SAN_MARKER_POSITION = HUI_POSITIONS[0] / 2;

const STRING_ENDPOINTS = [
  { y1: -21.6, y2: -9 },
  { y1: -14.4, y2: -6 },
  { y1: -7.2, y2: -3 },
  { y1: 0, y2: 0 },
  { y1: 7.2, y2: 3 },
  { y1: 14.4, y2: 6 },
  { y1: 21.6, y2: 9 },
] as const;
const X1 = 363; // position 0(岳山木塊內緣,徽位換算基準——非弦線段本身端點 x=379)
const X2 = -22;  // position 1(龍齦端)

function markerPoint(stringIndex: number, position: number): { x: number; y: number } {
  const { y1, y2 } = STRING_ENDPOINTS[stringIndex];
  return { x: X1 + (X2 - X1) * position, y: y1 + (y2 - y1) * position };
}

export function GuqinDisplay() {
  const notes = useStore((s) => s.notes);
  const complete = notes.filter(isNoteComplete);

  return (
    <div style={{ position: 'relative', width: 480, height: 160 }}>
      <img src="/guqin-vector.svg" width={480} height={160} alt="古琴" />
      <svg
        viewBox="0 0 480 160" width={480} height={160}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <g transform="translate(45.5,80)">
          {complete.map((n) => {
            const pos = n.type === 'san' ? SAN_MARKER_POSITION : (n.position ?? 0.5);
            const { x, y } = markerPoint(n.string! - 1, pos);
            return <circle key={n.id} cx={x} cy={y} r={4} fill="#ffe066" opacity={0.9} />;
          })}
        </g>
      </svg>
    </div>
  );
}
```

> 註:此步只做**靜態標記**(音存在即顯示一個點),隨播放時鐘亮度變化與走手音移動屬於高層計畫里程碑 6-7,留待下一份計畫實作;這裡先確保工作區建立的音能在展示區正確的弦、正確的位置對上。

- [ ] **Step 2: 在 App.tsx 掛上 GuqinDisplay**

Update `src/App.tsx` 加入 `import { GuqinDisplay } from './components/GuqinDisplay';` 並在 `<PositionStrip />` 之後加 `<GuqinDisplay />`。

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:看到 `guqin-vector.svg` 的古琴圖;建立一個音、用快捷鍵補上弦號(與位置,若非散音)後,展示區的對應弦上出現一個黃點,水平位置與 `PositionStrip`/`Timeline` 顯示的位置吻合。

- [ ] **Step 4: 提交**

```bash
git add src/components/GuqinDisplay.tsx src/App.tsx
git commit -m "feat: add GuqinDisplay rendering note markers on guqin-vector.svg"
```

---

## Task 11: 時間軸 / 音清單 Timeline(列出/選取/刪除,含未完成占位音標示)

**Files:**
- Create: `src/components/Timeline.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 實作 Timeline.tsx**

Create `src/components/Timeline.tsx`:

```tsx
import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';

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
            style={{
              fontWeight: n.id === selectedId ? 'bold' : 'normal',
              color: isNoteComplete(n) ? undefined : '#e08',
            }}
          >
            {n.startTime.toFixed(2)}s — 第{n.string ?? '?'}弦 — {TYPE_LABEL[n.type]}
            {n.position !== undefined && ` @ ${n.huiNotation ?? n.position.toFixed(2)}`}
            {!isNoteComplete(n) && ' (未完成)'}
            <button onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}>刪除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: 在 App.tsx 掛上 Timeline**

Update `src/App.tsx` 加入 `import { Timeline } from './components/Timeline';` 並在 `<GuqinDisplay />` 之後加 `<Timeline />`。

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:建立幾個音後,清單依時間排序顯示;未補齊弦號/位置的占位音以醒目顏色標示「(未完成)」;點某項會粗體選取(並可用快捷鍵繼續補欄位);按刪除會從清單、展示區同時消失。

- [ ] **Step 4: 提交**

```bash
git add src/components/Timeline.tsx src/App.tsx
git commit -m "feat: add Timeline list with select, delete, and incomplete-note indicator"
```

---

## Task 12: 匯出/匯入面板 ExportPanel

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
Expected:建立數個音(含至少一個未補完的占位音)→ 匯出 JSON(下載一個 `.guqin.json`)→ 重新整理頁面 → 匯入剛才的檔案 → 音清單、展示區標記與匯出前一致。

- [ ] **Step 4: 全套測試與提交**

Run: `npm test`
Expected:所有單元測試 PASS(guqin、notes、serialize、store、fieldInput)。

```bash
git add src/components/ExportPanel.tsx src/App.tsx
git commit -m "feat: add ExportPanel for JSON export/import round-trip"
```

---

## 驗收(本切片完成的定義)

- `npm test` 全綠(guqin、notes、serialize、store、fieldInput 的單元測試)。
- `npm run dev` 後可:載入音檔並播放/暫停(滑鼠或 `Space`)、時間與聲音同步;`S`/`F`/`A` 在當前時間建立占位音並自動選中;`Tab` 切換欄位、數字鍵+`Enter` 或在 `PositionStrip` 點擊都能正確補上弦號與位置/徽位;`StatusBar` 即時顯示選中音摘要與編輯中欄位/緩衝字串;`Shift+←/→` 能微調選中音時間;展示區 `GuqinDisplay` 在 `guqin-vector.svg` 上正確弦、正確位置顯示標記;`Timeline` 可選取/刪除且標示未完成音;匯出後重新匯入畫面一致(round-trip 無損)。

## 下一份計畫(本切片之後)

依高層計畫 `計畫─第一步.md` 的里程碑:
- ADSR 曲線編輯器(SVG 控制點)、`NoteInspector` 完整面板
- 展示區隨播放時鐘的即時光帶特效(亮起/移動/消失),取代本切片的靜態標記
- 走手音軌跡編輯器 + 虛音渲染
- `PositionStrip` 點擊按音時的「正規化位置 → 最近徽分記法」反向換算,取代 Task 9 的暫時簡化
- 減字譜欄位 UI、自動存檔、undo/redo、播放速度、量化

每項在本地基跑通後各自立計畫。
