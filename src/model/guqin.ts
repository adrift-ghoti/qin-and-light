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

/**
 * parseHuiNotation 的反函式:把正規化位置(0..1,例如滑鼠點擊 PositionStrip 算出的按音位置)
 * 換算回徽分記法字串 "N" 或 "N.f",供只有 position、沒有 huiNotation 原文的按音顯示用
 * (按音在 PositionStrip 上點擊設定時直接寫入 position,不經過 parseHuiNotation,見 setNotePosition)。
 * 找出 p 落在哪個徽位區間(base <= p < next),十分位四捨五入後夾在 0-9(徽外按音同 parseHuiNotation
 * 的規則,13 徽的區間終點視為龍齦 position=1)。
 */
export function positionToHuiNotation(position: number): string {
  const p = Math.min(1, Math.max(0, position));
  let hui = 1;
  for (let i = HUI_POSITIONS.length - 1; i >= 0; i -= 1) {
    if (HUI_POSITIONS[i] <= p) {
      hui = i + 1;
      break;
    }
  }
  const base = HUI_POSITIONS[hui - 1];
  const next = hui === 13 ? 1 : HUI_POSITIONS[hui];
  const span = next - base;
  const rawTenth = span === 0 ? 0 : ((p - base) / span) * 10;
  const tenth = Math.min(9, Math.max(0, Math.round(rawTenth)));
  return tenth === 0 ? String(hui) : `${hui}.${tenth}`;
}
