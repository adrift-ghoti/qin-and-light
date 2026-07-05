import { useEffect, useRef, useState } from 'react';
import { engine } from '../audio/engineInstance';
import { useStore } from '../state/store';

export function TransportBar() {
  const setAudio = useStore((s) => s.setAudio);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const audio = useStore((s) => s.audio);
  const currentTime = useStore((s) => s.currentTime); // 訂閱式讀取,才會在播放中隨時間重繪
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setCurrentTime(engine.getTime());
      setPlaying(engine.isPlaying());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [setCurrentTime]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const meta = await engine.loadFile(file);
    setAudio({ fileName: file.name, ...meta });
  }

  return (
    <div className="transport">
      <input type="file" accept="audio/*" onChange={onFile} />
      <button className="btn" onClick={() => (playing ? engine.pause() : engine.play())}>
        {playing ? '⏸ 暫停' : '▶ 播放'}
      </button>
      <span>
        {currentTime.toFixed(2)}s / {audio?.durationSec.toFixed(2) ?? '0'}s
      </span>
      {audio && <span> — {audio.fileName}</span>}
    </div>
  );
}
