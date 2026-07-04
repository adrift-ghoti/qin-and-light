import { AudioEngine } from './AudioEngine';

// 全域單例:讓 TransportBar(元件)與 useGlobalShortcuts(hook)都能存取同一個播放引擎,
// 而不需要其中一方從另一方 import(避免 hooks → components 的反向依賴)。
export const engine = new AudioEngine();
