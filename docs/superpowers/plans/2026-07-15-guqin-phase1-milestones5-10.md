# 古琴聲光秀 Phase 1 — 里程碑 5–10 詳細實作計畫

> **實作狀態：已全部完成（2026-07-15）**
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

`計畫─第一步.md` 定義了 10 個里程碑。里程碑 1–4(骨架、靜態畫面、音事件、音色三型)與外觀重設計已由 `2026-06-08-guqin-phase1-foundation.md` 和 `2026-07-05-editor-redesign.md` 完成實作。

本計畫涵蓋**里程碑 5–10**：ADSR 曲線編輯器、即時光帶特效、走手音軌跡編輯器、指法庫、減字譜/自動存檔、打磨(undo/redo + 播速)。

---

## 現有架構快覽（避免重複造輪）

| 路徑 | 用途 |
|---|---|
| `src/model/types.ts` | `Note`, `EnvelopePoint`, `SlidePoint`, `Project` 型別 |
| `src/model/notes.ts` | `DEFAULT_ADSR`, `createPlaceholderNote`, `uid()` |
| `src/model/guqin.ts` | `HUI_POSITIONS`, `parseHuiNotation`, `positionToHuiNotation` |
| `src/state/store.ts` | Zustand store；已有 `notes`, `selectedId`, `currentTime`, `editBuffer` |
| `src/audio/AudioEngine.ts` | `play/pause/seek/getTime`；以 `AudioBufferSourceNode` 驅動 |
| `src/audio/engineInstance.ts` | 全域 singleton `engine` |
| `src/components/GuqinDisplay.tsx` | SVG overlay；現在只渲染靜態圓點；常數 `X1=363`, `X2=-22`, `STRING_ENDPOINTS` |
| `src/components/AdsrPanel.tsx` | **Stub** |
| `src/components/SlidePathPanel.tsx` | **Stub** |
| `src/hooks/useGlobalShortcuts.ts` | 全域快捷鍵；需擴充 `Ctrl+Z/Y` 與 `T` |

---

## 里程碑 5：ADSR 曲線編輯器

**目標**：AdsrPanel 能顯示並編輯選中音的包絡曲線（`note.adsr`）。

### Task 5-1：新增 store actions

- [ ] `src/state/store.ts` 加入 `setNoteAdsr(id, adsr)` 與 `setNoteSlide(id, slide)`
- [ ] 實作：用 `notes.map` 找 id 並替換對應陣列；同時加入 undo snapshot（見 M10）

### Task 5-2：建立 `CurveEditor` 共用元件

- [ ] 新增 `src/components/CurveEditor.tsx`，供 ADSR 與走手音共用

Props：
```ts
interface CurveEditorProps {
  points: { t: number; value: number }[];
  onChange: (pts: { t: number; value: number }[]) => void;
  yLabel?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  anchorPoint?: CurvePoint;      // 隱含原點（走手音用）
  selectedAnchor?: boolean;
  onSelectAnchor?: () => void;
  selectedIdx?: number | null;
  onSelectIdx?: (i: number | null) => void;
}
```

SVG 畫布（viewBox `0 0 480 130`），X = 時間軸，Y = value：
- `<polyline>` 連接控制點（線性插值）
- 每個控制點：`<circle r={6}>`，點擊選中（高亮），拖曳改座標
- 空白處點擊：插入新控制點（依 t 排序）
- 選中控制點按 `Delete`：移除（至少保留 2 點）
- `anchorPoint`：以虛線空心圓顯示，不可刪除（走手音隱含原點）

### Task 5-3：實作 `AdsrPanel`

- [ ] 改寫 `src/components/AdsrPanel.tsx`
- [ ] 讀 `selectedId`；找對應 note 的 `adsr`；無選中音時顯示提示
- [ ] `<CurveEditor>` 的 `onChange` 呼叫 `setNoteAdsr(id, pts)`
- [ ] xRange 動態：`[0, max(2, lastAdsr.t + 0.3)]`

---

## 里程碑 6：即時光帶特效

**目標**：GuqinDisplay 隨 `currentTime` 即時渲染光點/光帶，音播完消失，同弦新音切斷前音。

### Task 6-1：插值工具函式

- [ ] 新增 `src/model/lightEffect.ts`

```ts
/** 線性插值 ADSR，超出範圍回傳 0 */
export function sampleAdsr(adsr: EnvelopePoint[], t: number): number

/** 每條弦取 startTime <= currentTime 最新的完整音；ADSR 結束則不渲染 */
export function activeNotePerString(
  notes: Note[], currentTime: number
): Map<number, { note: Note; elapsed: number; brightness: number }>
```

### Task 6-2：改寫 `GuqinDisplay`

- [ ] 改寫 `src/components/GuqinDisplay.tsx`
- [ ] 訂閱 `currentTime`（TransportBar 的 RAF 已驅動 `setCurrentTime`）
- [ ] 加 SVG `<defs>` glow filter（`feGaussianBlur stdDeviation="3"`）
- [ ] 散音：`<line>` 整條弦，`stroke-opacity = brightness`
- [ ] 泛音：`<circle r={7}>` 在 hui 位置
- [ ] 按音：`<circle r={6}>` 在 position 位置（走手音見 M7）
- [ ] 顏色：`#ffe066`；移除舊靜態圓點

---

## 里程碑 7：走手音軌跡編輯器 + 虛音渲染

**目標**：SlidePathPanel 可編輯 `note.slide`；GuqinDisplay 渲染光點移動與虛音拖尾。

### Task 7-1：更新 `SlidePoint` 型別

- [ ] `src/model/types.ts` 的 `SlidePoint` 加 `techniqueId?: string`

### Task 7-2：實作 `SlidePathPanel`

- [ ] 改寫 `src/components/SlidePathPanel.tsx`
- [ ] 只有按音（`type === 'an'`）啟用；其他音顯示提示文字
- [ ] 座標轉換：`CurvePoint.value = SlidePoint.position`
- [ ] xRange = `[min(-0.5, ...slide.t), max(3, ...slide.t)]`（支援負 t 滑入指法）
- [ ] 隱含原點（`{t:0, value:note.position}`）：空心虛線圓，可選中作為指法錨點
- [ ] onChange：呼叫 `setNoteSlide(id, pts)`（手動拖曳自動清空 `techniqueId`）

### Task 7-3：GuqinDisplay 走手音渲染

- [ ] `lightEffect.ts` 新增：
  - `sampleSlide(slide, t)` — 線性插值 position
  - `slideTrail(slide, elapsed, trailSec)` — 回傳過去 `trailSec` 秒的拖尾點
- [ ] GuqinDisplay 按音：若有 `slide` 則 `sampleSlide` 取當前位置
- [ ] 拖尾：`opacity = 0.4 * brightness * (1 - age/trailSec)`，預設 `trailSec = 0.3`

---

## 里程碑 8：指法庫

**目標**：內建六種指法預載；`T` 鍵開啟指法選單，套用後修改選中按音的走手音曲線或新建音序列。

### Task 8-1：型別與預設指法

- [ ] 新增 `src/model/techniques.ts`（`SlideShapeTechnique`, `SequenceTechnique`, `TechniqueDefinition`）
- [ ] 新增 `src/data/defaultTechniques.ts`（綽/注/上/下/吟/猱，依 `計畫─第一步.md` §3.2）

### Task 8-2：Store 擴充

- [ ] `src/state/store.ts` 加入：
  - `techniques: TechniqueDefinition[]`（初始值 = DEFAULT_TECHNIQUES）
  - `techniqueMenuOpen: boolean`
  - `selectedSlidePointIndex: number | null`（null = 隱含原點）
  - `openTechniqueMenu / closeTechniqueMenu / setSelectedSlidePointIndex`
  - `applyTechnique(techniqueId, anchorTime, promptDeltaFn?)` — 局部覆蓋邏輯（見 §3.2）
  - `importTechniques(ts, onConflict: 'rename'|'overwrite')`

`applyTechnique` slideShape 邏輯：
1. 錨點 = `slide[selectedSlidePointIndex]` 或 `{t:0, position:note.position}`
2. 計算覆蓋範圍 `[anchorT + min(pts.t), anchorT + max(pts.t)]`
3. 刪除範圍內舊點，插入新點（`deltaPosition===null` 時呼叫 `promptDeltaFn`）
4. 標記 `techniqueId` 於新點

### Task 8-3：`TechniqueMenu` 元件

- [ ] 新增 `src/components/TechniqueMenu.tsx`
- [ ] `position: fixed` overlay，`<input>` 自動聚焦
- [ ] ↑↓ 選項，`Enter` 套用，`Escape` 關閉
- [ ] 「上/下」`deltaPosition===null` 時用 `window.prompt()` 詢問終點徽分

### Task 8-4 & 8-5

- [ ] `useGlobalShortcuts.ts` 加 `T` → `openTechniqueMenu()`
- [ ] `ExportPanel.tsx` 加指法庫匯出（`{ version:'1', techniques }`）與匯入（id 衝突提示）

---

## 里程碑 9：減字譜欄位 + 自動存檔

**目標**：可輸入每音的減字譜；開啟頁面時自動還原上次專案。

### Task 9-1：NoteInspector 元件

- [ ] 新增 `src/components/NoteInspector.tsx`
- [ ] 顯示選中音的音色/弦/位置/時間
- [ ] `jianzipu` 文字輸入框 → `setNoteJianzipu(id, text)`
- [ ] `store.ts` 加 `setNoteJianzipu(id, text)`

### Task 9-2：自動存檔

- [ ] 新增 `src/hooks/useAutosave.ts`
- [ ] mount 時：localStorage 有存檔且 store 無音訊 → `deserializeProject` + `loadProject`
- [ ] `notes`/`audio` 變動後 debounce 1s → `localStorage.setItem('guqin-autosave', json)`
- [ ] `App.tsx` 呼叫 `useAutosave()`

---

## 里程碑 10：打磨

**目標**：Ctrl+Z/Y undo/redo；播放速度選擇。

### Task 10-1：Undo/Redo

- [ ] `store.ts` 加 `_past: Note[][]`、`_future: Note[][]`（上限各 50 筆）
- [ ] 所有修改 `notes` 的 action 開頭執行 snapshot（`[..._past, notes].slice(-50)`，同時清空 `_future`）
- [ ] `undo()`: pop `_past` → 設 `notes`；push 當前到 `_future`
- [ ] `redo()`: pop `_future` → 設 `notes`；push 當前到 `_past`
- [ ] `useGlobalShortcuts.ts`：`Ctrl+Z` → `undo()`；`Ctrl+Y` / `Ctrl+Shift+Z` → `redo()`

### Task 10-2：播放速度

- [ ] `AudioEngine.ts` 加 `playbackRate = 1`；`setPlaybackRate(r)` 直接改 `source.playbackRate.value`
- [ ] `store.ts` 加 `playbackRate: number` + `setPlaybackRate(r)`
- [ ] `TransportBar.tsx` 加 `<select>` 速度選擇（0.5×/0.75×/1×）

---

## 新增/修改檔案彙整

| 里程碑 | 新增 | 修改 |
|---|---|---|
| M5 | `CurveEditor.tsx` | `AdsrPanel.tsx`、`store.ts` |
| M6 | `lightEffect.ts` | `GuqinDisplay.tsx` |
| M7 | — | `SlidePathPanel.tsx`、`types.ts`、`lightEffect.ts`、`GuqinDisplay.tsx` |
| M8 | `techniques.ts`、`defaultTechniques.ts`、`TechniqueMenu.tsx` | `store.ts`、`useGlobalShortcuts.ts`、`ExportPanel.tsx` |
| M9 | `NoteInspector.tsx`、`useAutosave.ts` | `store.ts`、`App.tsx` |
| M10 | — | `store.ts`、`AudioEngine.ts`、`TransportBar.tsx`、`useGlobalShortcuts.ts` |

---

## Verification

**M5 ADSR**：選一個音 → AdsrPanel 顯示包絡曲線控制點 → 拖曳某控制點 → `note.adsr` 值改變（匯出 JSON 確認）→ 新增/刪除控制點正常。

**M6 光帶**：載入音檔 → 插入完整音（含弦號與位置）→ 播放 → GuqinDisplay 看到亮點隨時間出現後消失 → 同弦按第二個音，第一個立即熄滅。

**M7 走手音**：選按音 → SlidePathPanel 拖曳建立走手音曲線 → 播放 → 光點沿弦移動，移動軌跡留下短暫拖尾。

**M8 指法庫**：按 T → 搜尋「吟」→ Enter 套用 → SlidePathPanel 出現顫音曲線 → 再選中一個控制點套「上」，另一時段點保留不被清除 → 指法庫 JSON 匯出/匯入 round-trip 正確；「上/下」套用時 prompt 詢問終點。

**M9 減字譜/自動存檔**：NoteInspector 輸入減字譜文字 → 匯出 JSON 含 `jianzipu` 欄位 → 重新整理頁面 → 自動還原上次編輯（notes + audio 元資料）。

**M10 undo/redo**：插入音 → Ctrl+Z → 音消失 → Ctrl+Y → 音回來 → 連續 undo 至最初不當機 → 速度切 0.5× 後播放速度明顯變慢。

**端對端**：用一段古琴錄音跑完全流程（插音 → ADSR 微調 → 按音加吟/走手音 → 播放光效 → 匯出 JSON → 重新整理 → 自動還原），資料 round-trip 無損。
