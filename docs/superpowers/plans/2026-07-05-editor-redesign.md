# 編輯器視覺重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把目前完全無樣式的古琴聲光秀編輯器,套上「水墨古卷」美術風格與新版面配置(頂部提示/操作區、展示區+音清單雙欄、全寬弦線工作區、ADSR/走手音佔位雙欄),不改變任何既有功能或資料流。

**Architecture:** 新增單一共用樣式檔 `src/styles.css`(CSS 變數 + 共用 `.panel`/`.panel-label`/`.btn` class),在 `App.tsx` 重新排列既有六個元件的 JSX 容器結構,並在各元件內把「靜態外觀」的 inline style 換成 CSS class(動態計算的定位值——如依滑鼠位置算出的座標——維持 inline)。新增兩個佔位元件 `AdsrPanel`、`SlidePathPanel`,只有面板框架與標籤文字,無互動邏輯。

**Tech Stack:** React 18, TypeScript, Vite。不引入任何新的 npm 套件(不用 CSS Modules、CSS-in-JS、Tailwind)。

## Global Constraints

- 這次不改變任何元件的功能行為:快捷鍵(`useGlobalShortcuts`)、store(`state/store.ts`)、`AudioEngine`、資料模型(`model/`)完全不動。
- 色票固定使用 spec 定義的七個值,不得另外發明新色:`--bg:#f3ede1` `--panel:#fbf7ee` `--border:#c9b98f` `--border-soft:#ddd0ac` `--ink:#2b2621` `--ink-soft:#6b5f45` `--red:#a63b2e` `--gold:#b8944a`。
- 字體:`"Noto Serif TC", "Songti TC", serif`。
- 不做響應式/行動裝置版面,維持現有元件的固定尺寸假設(`GuqinDisplay` 480×160、`PositionStrip` 800×60)。
- `GuqinDisplay` 疊加的音符標記顏色 `#ffe066` 是展示內容本身(古琴上的光點),不是介面裝飾,不在本次配色調整範圍內,維持不變。
- ADSR / 走手音面板這次只做版面佔位(框架 + 標籤文字),不做互動功能與資料模型。
- 每個任務結束後執行 `npm test` 確認既有 Vitest 測試套件(`model/`、`state/`、`hooks/`)全數維持通過(樣式變更不應影響任何測試)。

**參考文件:** `docs/superpowers/specs/2026-07-05-editor-redesign-design.md`(完整設計規格與版面草圖說明)

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `src/styles.css`(新增) | 全域 CSS 變數、reset、共用 `.panel`/`.panel-label`/`.btn` class、版面容器 class(`.top-bar`/`.main-panels`/`.workspace-strip`/`.workspace-drawer`) |
| `src/App.tsx`(修改) | import 樣式檔;JSX 重組為頂部區塊/雙欄主區/全寬工作區/全寬佔位雙欄 |
| `src/components/AdsrPanel.tsx`(新增) | 包絡編輯器佔位面板 |
| `src/components/SlidePathPanel.tsx`(新增) | 走手音路徑編輯器佔位面板 |
| `src/components/GuqinDisplay.tsx`(修改) | 加上 `.panel`/`.display-panel` 外框與標籤,靜態定位 style 換成 `.display-stage`/`.display-overlay` class |
| `src/components/Timeline.tsx`(修改) | 加上 `.panel`/`.list-panel` 外框與標籤,選中/未完成狀態從 inline style 改為 class |
| `src/components/PositionStrip.tsx`(修改) | 加上 `.panel`/`.workspace-strip` 外框與標籤,弦線/徽位刻度/選中標記從 inline 顏色改為 class,active/inactive 狀態改用 class 切換 |
| `src/components/TransportBar.tsx`(修改) | 播放按鈕加上 `.btn` class |
| `src/components/ExportPanel.tsx`(修改) | 匯出按鈕加上 `.btn` class |

`src/components/StatusBar.tsx` 不需要修改——底線顏色透過全域 CSS 規則 `.status-bar span { text-decoration-color: var(--red); }` 套用,元件本身的 inline `textDecoration` 邏輯（決定要不要畫底線）保持不變。

---

## Task 1: 全域樣式檔基礎(變數、reset、共用 class)

**Files:**
- Create: `src/styles.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: CSS 變數 `--bg` `--panel` `--border` `--border-soft` `--ink` `--ink-soft` `--red` `--gold`;共用 class `.panel` `.panel-label` `.btn`。後續所有任務都會用到這些 class 名稱與變數名稱,必須完全一致。

- [ ] **Step 1: 建立 `src/styles.css`**

Create `src/styles.css`:

```css
:root {
  --bg: #f3ede1;
  --panel: #fbf7ee;
  --border: #c9b98f;
  --border-soft: #ddd0ac;
  --ink: #2b2621;
  --ink-soft: #6b5f45;
  --red: #a63b2e;
  --gold: #b8944a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border-soft);
  border-radius: 2px;
  padding: 8px 10px;
}

.panel-label {
  font-size: 10px;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.btn {
  border: 1px solid var(--gold);
  color: var(--gold);
  background: transparent;
  padding: 3px 12px;
  border-radius: 1px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 2: 在 `App.tsx` 引入樣式檔**

在 `src/App.tsx` 檔案最上方(第一行 import 之前)加入:

```tsx
import './styles.css';
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`,開啟顯示的網址。
Expected:整個頁面背景變成米宣紙色(`#f3ede1`),文字字體變成襯線字體。既有的六個區塊排列順序與功能完全不變(這個任務還沒調整版面結構)。

- [ ] **Step 4: 確認既有測試不受影響**

Run: `npm test`
Expected:PASS,所有既有測試(`model/`、`state/`、`hooks/` 底下)維持通過,數量與修改前相同。

- [ ] **Step 5: 提交**

```bash
git add src/styles.css src/App.tsx
git commit -m "feat: add global stylesheet with ink-wash color variables and shared panel classes"
```

---

## Task 2: 新增 ADSR / 走手音佔位面板,重組 App.tsx 版面骨架

**Files:**
- Create: `src/components/AdsrPanel.tsx`, `src/components/SlidePathPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 的 `.panel` `.panel-label` class。
- Produces: `AdsrPanel` `SlidePathPanel` 元件(無 props,無 export 之外的公開介面);CSS class `.top-bar` `.main-panels` `.workspace-drawer`,後續任務會沿用這些 class 名稱。

- [ ] **Step 1: 建立佔位面板元件**

Create `src/components/AdsrPanel.tsx`:

```tsx
export function AdsrPanel() {
  return (
    <div className="panel">
      <div className="panel-label">包絡(ADSR)</div>
    </div>
  );
}
```

Create `src/components/SlidePathPanel.tsx`:

```tsx
export function SlidePathPanel() {
  return (
    <div className="panel">
      <div className="panel-label">走手音路徑(僅按音)</div>
    </div>
  );
}
```

- [ ] **Step 2: 在 `styles.css` 加入版面容器 class**

在 `src/styles.css` 檔案末尾加入:

```css
.top-bar {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--ink-soft);
}

.top-bar-title {
  font-size: 17px;
  letter-spacing: 0.15em;
  color: var(--ink);
  margin: 0;
}

.main-panels {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}

.workspace-strip {
  margin-bottom: 12px;
}

.workspace-drawer {
  display: flex;
  gap: 12px;
}

.workspace-drawer .panel {
  flex: 1;
}
```

- [ ] **Step 3: 重組 `App.tsx`**

Replace `src/App.tsx` 內容:

```tsx
import './styles.css';
import { TransportBar } from './components/TransportBar';
import { StatusBar } from './components/StatusBar';
import { PositionStrip } from './components/PositionStrip';
import { GuqinDisplay } from './components/GuqinDisplay';
import { Timeline } from './components/Timeline';
import { ExportPanel } from './components/ExportPanel';
import { AdsrPanel } from './components/AdsrPanel';
import { SlidePathPanel } from './components/SlidePathPanel';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export default function App() {
  useGlobalShortcuts();

  return (
    <div className="app">
      <div className="top-bar">
        <h1 className="top-bar-title">古琴聲光秀 編輯器</h1>
        <TransportBar />
        <StatusBar />
        <ExportPanel />
      </div>
      <div className="main-panels">
        <GuqinDisplay />
        <Timeline />
      </div>
      <PositionStrip />
      <div className="workspace-drawer">
        <AdsrPanel />
        <SlidePathPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`
Expected:頁面由上而下依序出現:(1) 標題+播放列+狀態列+匯出面板同一條頂部區塊;(2) 展示區與音清單並排(此時尚未套用面板框線,仍是原本樣子,因為 `GuqinDisplay`/`Timeline` 還沒在 Task 3 加上 `.panel` class);(3) 弦線工作區;(4) 兩個標示「包絡(ADSR)」與「走手音路徑(僅按音)」的空白面板並排。所有既有功能(播放、快捷鍵插入音、選取、刪除、匯出匯入)照常運作。

- [ ] **Step 5: 確認既有測試不受影響**

Run: `npm test`
Expected: PASS,測試數量與 Task 1 後相同。

- [ ] **Step 6: 提交**

```bash
git add src/components/AdsrPanel.tsx src/components/SlidePathPanel.tsx src/App.tsx src/styles.css
git commit -m "feat: add ADSR/slide-path placeholder panels and restructure App layout"
```

---

## Task 3: 展示區與音清單套上面板樣式(雙欄主區)

**Files:**
- Modify: `src/components/GuqinDisplay.tsx`
- Modify: `src/components/Timeline.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1/2 的 `.panel` `.panel-label` `.main-panels` class。
- Produces: CSS class `.display-panel` `.display-stage` `.display-overlay` `.list-panel`,及 `Timeline` 的 `li` 狀態 class `.selected` `.incomplete`(給 Task 6 最終驗證核對用)。

- [ ] **Step 1: 在 `styles.css` 加入展示區與音清單樣式**

在 `src/styles.css` 末尾加入:

```css
.display-panel {
  flex: 2;
}

.display-stage {
  position: relative;
  width: 480px;
  height: 160px;
}

.display-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.list-panel {
  flex: 1;
  min-width: 180px;
}

.timeline ul {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 12px;
}

.timeline li {
  padding: 4px 0;
  border-bottom: 1px solid var(--border-soft);
  cursor: pointer;
}

.timeline li:last-child {
  border-bottom: none;
}

.timeline li.selected {
  font-weight: 600;
}

.timeline li.incomplete {
  color: var(--red);
}
```

- [ ] **Step 2: 重寫 `GuqinDisplay.tsx`**

Replace `src/components/GuqinDisplay.tsx` 內容:

```tsx
import { useStore } from '../state/store';
import { isNoteComplete } from '../model/types';
import { HUI_POSITIONS } from '../model/guqin';

// 散音無按點,光點固定放在岳山(position=0)與一徽的中點,示意「整弦振動」而非某個具體按點。
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
    <div className="panel display-panel">
      <div className="panel-label">展示區</div>
      <div className="display-stage">
        <img src="/guqin-vector.svg" width={480} height={160} alt="古琴" />
        <svg viewBox="0 0 480 160" width={480} height={160} className="display-overlay">
          <g transform="translate(45.5,80)">
            {complete.map((n) => {
              const pos = n.type === 'san' ? SAN_MARKER_POSITION : (n.position ?? 0.5);
              const { x, y } = markerPoint(n.string! - 1, pos);
              return <circle key={n.id} cx={x} cy={y} r={4} fill="#ffe066" opacity={0.9} />;
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 重寫 `Timeline.tsx`**

Replace `src/components/Timeline.tsx` 內容:

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
    <div className="panel list-panel timeline">
      <div className="panel-label">音清單({notes.length})</div>
      <ul>
        {sorted.map((n) => {
          const classNames = [
            n.id === selectedId ? 'selected' : '',
            isNoteComplete(n) ? '' : 'incomplete',
          ].filter(Boolean).join(' ');
          return (
            <li key={n.id} onClick={() => selectNote(n.id)} className={classNames || undefined}>
              {n.startTime.toFixed(2)}s — 第{n.string ?? '?'}弦 — {TYPE_LABEL[n.type]}
              {n.position !== undefined && ` @ ${n.huiNotation ?? n.position.toFixed(2)}`}
              {!isNoteComplete(n) && ' (未完成)'}
              <button className="btn" onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}>刪除</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`
Expected:展示區與音清單各自有淡色面板框線與標籤(「展示區」「音清單(N)」)。展示區下方不再出現多餘空白(因為 `.main-panels` 用 `align-items: flex-start`,兩欄不再互相拉伸等高)。選中的音在清單中變粗體,未完成的音文字變成硃砂紅色。點擊清單項目仍可選取、點「刪除」仍可刪除且不會誤觸選取(`e.stopPropagation()` 邏輯未變)。載入音檔播放時,展示區的琴圖上仍會出現對應的黃色光點標記。

- [ ] **Step 5: 確認既有測試不受影響**

Run: `npm test`
Expected: PASS,測試數量不變。

- [ ] **Step 6: 提交**

```bash
git add src/components/GuqinDisplay.tsx src/components/Timeline.tsx src/styles.css
git commit -m "feat: apply panel styling to GuqinDisplay and Timeline, fix stretch gap"
```

---

## Task 4: 弦線工作區套上全寬面板樣式

**Files:**
- Modify: `src/components/PositionStrip.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 的 `.panel` `.panel-label` class,Task 1 的 `--gold` `--red` `--ink-soft` 變數。
- Produces: CSS class `.position-strip`(含 `.active` 修飾)、`.strip-line`、`.hui-dot`、`.strip-marker`。

- [ ] **Step 1: 在 `styles.css` 加入弦線工作區樣式**

在 `src/styles.css` 末尾加入:

```css
.position-strip {
  position: relative;
  background: #efe6d3;
  opacity: 0.6;
  cursor: default;
}

.position-strip.active {
  opacity: 1;
  cursor: pointer;
}

.strip-line {
  position: absolute;
  top: 50%;
  left: 20px;
  right: 20px;
  height: 2px;
  background: var(--gold);
  transform: translateY(-1px);
}

.hui-dot {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--ink-soft);
}

.strip-marker {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -5px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 4px rgba(166, 59, 46, 0.5);
}
```

- [ ] **Step 2: 重寫 `PositionStrip.tsx`**

Replace `src/components/PositionStrip.tsx` 內容:

```tsx
import { useRef } from 'react';
import { HUI_POSITIONS, nearestHui } from '../model/guqin';
import { useStore } from '../state/store';

const W = 800;
const H = 60;
const PAD_X = 20;

// position=0(岳山)畫在右邊、position=1(龍齦)畫在左邊,與 GuqinDisplay 的方向一致
// (GuqinDisplay 裡 X1=363/岳山 在較大的 x 座標、視覺上偏右,X2=-22/龍齦偏左)。
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
    <div className="panel workspace-strip">
      <div className="panel-label">工作區 · 弦線位置(點擊設定)</div>
      <div
        ref={ref}
        onClick={onClick}
        className={`position-strip${active ? ' active' : ''}`}
        style={{ width: W, height: H }}
      >
        <div className="strip-line" />
        {HUI_POSITIONS.map((p, i) => (
          <div key={i} className="hui-dot" style={{ left: positionX(p) - 3 }} title={`第${i + 1}徽`} />
        ))}
        {selected?.position !== undefined && (
          <div className="strip-marker" style={{ left: positionX(selected.position) - 5 }} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:弦線工作區佔滿整個版面寬度(不再收窄成左欄的一部分),有標籤「工作區 · 弦線位置(點擊設定)」。金色橫線與淺色徽位圓點清楚可見。選中一個按音/泛音並按 `Tab` 切到位置欄位後,工作區從半透明(未啟用)變成完全不透明且滑鼠變成手指狀(啟用),點擊可設定位置且出現硃砂紅色的選中標記,行為與修改前完全一致(只是外觀改變)。散音選中時工作區維持未啟用狀態。

- [ ] **Step 4: 確認既有測試不受影響**

Run: `npm test`
Expected: PASS,測試數量不變。

- [ ] **Step 5: 提交**

```bash
git add src/components/PositionStrip.tsx src/styles.css
git commit -m "feat: apply full-width panel styling to PositionStrip"
```

---

## Task 5: 頂部區塊按鈕樣式與狀態列底線配色

**Files:**
- Modify: `src/components/TransportBar.tsx`
- Modify: `src/components/ExportPanel.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 1 的 `.btn` class、Task 2 的 `.top-bar` class。
- Produces: 無新公開介面,純樣式收尾。

- [ ] **Step 1: 在 `styles.css` 加入狀態列底線配色與頂部區塊細部樣式**

在 `src/styles.css` 末尾加入:

```css
.status-bar span {
  text-decoration-color: var(--red);
}

.top-bar .transport,
.top-bar .status-bar,
.top-bar .export {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 2: 修改 `TransportBar.tsx` 的播放按鈕**

在 `src/components/TransportBar.tsx` 中,把:

```tsx
      <button onClick={() => (playing ? engine.pause() : engine.play())}>
        {playing ? '⏸ 暫停' : '▶ 播放'}
      </button>
```

改成:

```tsx
      <button className="btn" onClick={() => (playing ? engine.pause() : engine.play())}>
        {playing ? '⏸ 暫停' : '▶ 播放'}
      </button>
```

- [ ] **Step 3: 修改 `ExportPanel.tsx` 的匯出按鈕**

在 `src/components/ExportPanel.tsx` 中,把:

```tsx
      <button onClick={onExport}>匯出 JSON</button>
```

改成:

```tsx
      <button className="btn" onClick={onExport}>匯出 JSON</button>
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`
Expected:頂部區塊(標題、播放列、狀態列、匯出面板)排成一列,彼此有間距,視覺上是同一條「提示與操作」帶狀區域而非各自獨立的大卡片。播放鈕與匯出鈕都是金色細邊框、透明背景的樣式。選中一個音後,狀態列中正在編輯的欄位(弦號或徽位數字)底線顏色是硃砂紅,而不是預設黑色。

- [ ] **Step 5: 確認既有測試不受影響**

Run: `npm test`
Expected: PASS,測試數量不變。

- [ ] **Step 6: 提交**

```bash
git add src/components/TransportBar.tsx src/components/ExportPanel.tsx src/styles.css
git commit -m "feat: style top-bar buttons and status bar underline color"
```

---

## Task 6: 完整迴歸驗證

**Files:** 無新增/修改檔案,純驗證。

- [ ] **Step 1: 執行完整自動化測試**

Run: `npm test`
Expected: PASS,測試數量與檔案結構重整前完全相同(本次重新設計未新增或刪除任何 `.test.ts` 檔案)。

- [ ] **Step 2: 完整手動功能迴歸(比照 `docs/superpowers/plans/2026-06-08-guqin-phase1-foundation.md` 各任務的手動驗證項目,確認樣式改動未破壞任何行為)**

Run: `npm run dev`,依序確認:

1. 選一個 mp3/wav 音檔 → 頂部顯示檔名與總長 → 按播放列的「▶ 播放」聽到聲音、時間數字遞增,按「⏸ 暫停」聲音與數字停住。
2. 按 `S`/`F`/`A` 在目前播放時間插入散音/泛音/按音占位音,狀態列同步顯示型別與底線標示的待補欄位。
3. 選中按音/泛音後按 `Tab` 切換編輯欄位,弦線工作區從半透明(未啟用)變成不透明(啟用);點擊工作區設定位置,展示區的琴圖與弦線工作區都出現對應標記。
4. 音清單顯示所有音(含未完成的以硃砂紅標示 `(未完成)`),點清單項目可選取(該項目變粗體),點「刪除」按鈕可刪除且不誤觸選取。
5. 按「匯出 JSON」下載專案檔,重新整理頁面後用「匯入」選回同一個檔案,音清單與展示區還原成匯出前的狀態(round-trip 無損)。
6. 展示區與音清單維持左右並排,展示區下方沒有多餘空白;弦線工作區與 ADSR/走手音兩個佔位面板皆為全寬顯示,佔位面板只顯示標籤文字、無互動內容。

Expected:以上六項全數符合,瀏覽器主控台沒有出現任何錯誤或警告(既有的「欄位輸入無法解析」`console.warn` 除外,那是刻意設計的行為)。

- [ ] **Step 3: 提交(若驗證過程中有任何微調)**

若 Step 2 過程中發現需要修正的地方,修正後執行:

```bash
git add -A
git commit -m "fix: address issues found during editor redesign regression pass"
```

若沒有任何需要修正之處,本任務不需要額外提交。

---

## Self-Review Notes

- **Spec coverage:**美術方向與色票(Task 1)、頂部提示/操作區與雙欄主區與工作區/佔位雙欄的版面結構(Task 2-5)、單一共用 CSS 檔案做法(Task 1)、ADSR/走手音僅佔位不做互動(Task 2)、展示區下方不留空白(Task 3 的 `align-items: flex-start`)、Timeline 未完成音顏色改為統一色票(Task 3)——spec 各節都有對應任務覆蓋。
- **Placeholder scan:**所有 CSS 與 TSX 程式碼皆為完整內容,無 TBD/待補。
- **Type consistency:**`AdsrPanel`/`SlidePathPanel` 皆為無 props 的純展示元件,`className` 字串在各任務間一致(`panel`/`panel-label`/`display-panel`/`display-stage`/`display-overlay`/`list-panel`/`workspace-strip`/`workspace-drawer`/`position-strip`/`strip-line`/`hui-dot`/`strip-marker`/`btn`),無命名不一致問題。
