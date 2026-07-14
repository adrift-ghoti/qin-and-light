import { NoteType } from './types';

export interface SlideShapePoint {
  t: number;
  deltaPosition: number | null; // null = 套用時提示輸入絕對終點
}

export interface SlideShapeTechnique {
  id: string;
  name: string;
  type: 'slideShape';
  points: SlideShapePoint[];
}

export interface SequenceNoteTemplate {
  offsetTime: number;
  type: NoteType;
  string?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  huiNotation?: string;
}

export interface SequenceTechnique {
  id: string;
  name: string;
  type: 'sequence';
  notes: SequenceNoteTemplate[];
}

export type TechniqueDefinition = SlideShapeTechnique | SequenceTechnique;

export interface TechniqueLibraryFile {
  version: string;
  techniques: TechniqueDefinition[];
}

export function serializeTechniqueLibrary(techniques: TechniqueDefinition[]): string {
  const lib: TechniqueLibraryFile = { version: '1', techniques };
  return JSON.stringify(lib, null, 2);
}

export function deserializeTechniqueLibrary(json: string): TechniqueDefinition[] {
  const lib = JSON.parse(json) as TechniqueLibraryFile;
  if (!Array.isArray(lib.techniques)) throw new Error('指法庫格式錯誤：缺少 techniques 陣列');
  return lib.techniques;
}
