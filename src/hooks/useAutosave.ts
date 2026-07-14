import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { serializeProject, deserializeProject } from '../model/serialize';
import { PROJECT_VERSION } from '../model/types';

const KEY = 'guqin-autosave';

/** 初始化時若 localStorage 有存檔則還原；之後每次 notes/audio 變動後 debounce 1s 自動存檔 */
export function useAutosave() {
  const notes = useStore(s => s.notes);
  const audio = useStore(s => s.audio);
  const loadProject = useStore(s => s.loadProject);

  // 初始化還原（只在 mount 時執行一次）
  useEffect(() => {
    if (audio !== null) return; // 已有音訊，不覆蓋
    const saved = localStorage.getItem(KEY);
    if (!saved) return;
    try {
      const p = deserializeProject(saved);
      loadProject(p);
    } catch {
      // 存檔損壞就忽略
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce 自動存檔
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const json = serializeProject({
          version: PROJECT_VERSION,
          audio: audio ?? { fileName: '', durationSec: 0, sampleRate: 0 },
          notes,
        });
        localStorage.setItem(KEY, json);
      } catch {
        // 存檔失敗（例如隱私模式）靜默忽略
      }
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [notes, audio]);
}
