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
