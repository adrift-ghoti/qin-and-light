import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { createPlaceholderNote } from '../model/notes';
import { engine } from '../audio/engineInstance';
import { appendDigit } from './fieldInput';

const SEEK_STEP = 0.5;
const SEEK_STEP_BIG = 3;
const NUDGE_STEP = 0.01;
const NUDGE_STEP_BIG = 0.1;

export function useGlobalShortcuts() {
  const bufferRef = useRef('');
  // 是否正在編輯欄位緩衝字串:第一個數字鍵按下時設 true,Enter 成功/Esc 取消時設 false,
  // 選取新音或插入新占位音時也重設 false。只有這個值為 false 時,Delete/Backspace 才會刪除整個音;
  // 否則 Backspace 只刪 buffer 最後一字——避免 Enter 確認後 buffer 已清空,
  // 使用者多按一下 Backspace 就誤刪選中音的問題。
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
        e.preventDefault();
        if (isEditingRef.current) {
          setBuffer(bufferRef.current.slice(0, -1));
        } else {
          // 不在編輯中(buffer 已確認過或本來就沒在打字):Backspace 視同 Delete,刪除選中音。
          useStore.getState().removeNote(selected.id);
        }
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
