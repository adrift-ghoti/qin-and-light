import { TechniqueDefinition } from '../model/techniques';

export const DEFAULT_TECHNIQUES: TechniqueDefinition[] = [
  {
    id: 'chuo', name: '綽', type: 'slideShape',
    points: [{ t: -0.15, deltaPosition: +0.05 }, { t: 0, deltaPosition: 0 }],
  },
  {
    id: 'zhu', name: '注', type: 'slideShape',
    points: [{ t: -0.15, deltaPosition: -0.05 }, { t: 0, deltaPosition: 0 }],
  },
  {
    id: 'shang', name: '上', type: 'slideShape',
    points: [{ t: 0, deltaPosition: 0 }, { t: 0.3, deltaPosition: null }],
  },
  {
    id: 'xia', name: '下', type: 'slideShape',
    points: [{ t: 0, deltaPosition: 0 }, { t: 0.3, deltaPosition: null }],
  },
  {
    id: 'yin', name: '吟', type: 'slideShape',
    points: [
      { t: 0,    deltaPosition: 0 },
      { t: 0.1,  deltaPosition: -0.01 },
      { t: 0.2,  deltaPosition: +0.01 },
      { t: 0.3,  deltaPosition: -0.01 },
      { t: 0.4,  deltaPosition: +0.01 },
      { t: 0.5,  deltaPosition: 0 },
    ],
  },
  {
    id: 'nao', name: '猱', type: 'slideShape',
    points: [
      { t: 0,    deltaPosition: 0 },
      { t: 0.1,  deltaPosition: -0.03 },
      { t: 0.2,  deltaPosition: +0.03 },
      { t: 0.3,  deltaPosition: -0.03 },
      { t: 0.4,  deltaPosition: +0.03 },
      { t: 0.5,  deltaPosition: 0 },
    ],
  },
];
