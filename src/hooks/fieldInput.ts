/** 累積使用者鍵入的數字/小數點,供弦號或徽分記法欄位使用 */
export function appendDigit(buffer: string, key: string, field: 'string' | 'position'): string {
  if (field === 'string') {
    return /^[1-7]$/.test(key) ? key : buffer; // 弦號只接受單一 1-7 數字,不累積
  }
  if (/^[0-9]$/.test(key) || key === '.') return buffer + key;
  return buffer;
}
