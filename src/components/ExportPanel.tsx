import { useStore } from '../state/store';
import { serializeProject, deserializeProject } from '../model/serialize';
import { PROJECT_VERSION, Project } from '../model/types';
import { serializeTechniqueLibrary, deserializeTechniqueLibrary } from '../model/techniques';

export function ExportPanel() {
  const notes = useStore((s) => s.notes);
  const audio = useStore((s) => s.audio);
  const loadProject = useStore((s) => s.loadProject);
  const techniques = useStore(s => s.techniques);
  const importTechniques = useStore(s => s.importTechniques);

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
    e.target.value = '';
  }

  function onExportTechniques() {
    const blob = new Blob([serializeTechniqueLibrary(techniques)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guqin-techniques.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportTechniques(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const ts = deserializeTechniqueLibrary(text);
      const conflicts = ts.filter(t => techniques.some(e => e.id === t.id));
      let mode: 'rename' | 'overwrite' = 'rename';
      if (conflicts.length > 0) {
        const names = conflicts.map(c => c.name).join('、');
        const ok = window.confirm(
          `以下指法 id 已存在：${names}\n\n按「確定」覆蓋，按「取消」跳過衝突保留原有。`
        );
        mode = ok ? 'overwrite' : 'rename';
      }
      importTechniques(ts, mode);
      alert(`已匯入 ${ts.length} 個指法`);
    } catch (err) {
      alert(`指法庫匯入失敗:${(err as Error).message}`);
    }
    e.target.value = '';
  }

  return (
    <div className="export" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <button className="btn" onClick={onExport} title="匯出目前專案為 .guqin.json">
        匯出 JSON
      </button>
      <span className="export-hint">專案 JSON</span>
      <input type="file" accept="application/json,.json" onChange={onImport} />
      <span style={{ color: 'var(--border)', margin: '0 4px' }}>｜</span>
      <button className="btn" onClick={onExportTechniques} title="匯出指法庫">
        匯出指法庫
      </button>
      <input type="file" accept="application/json,.json" onChange={onImportTechniques} title="匯入指法庫 JSON" />
    </div>
  );
}
