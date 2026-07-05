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
      <button className="btn" onClick={onExport}>匯出 JSON</button>
      <input type="file" accept="application/json,.json" onChange={onImport} />
    </div>
  );
}
