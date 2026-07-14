import { useEffect, useRef, useState } from 'react';
import { engine } from '../audio/engineInstance';
import { useStore } from '../state/store';

const SPEED_OPTIONS = [0.5, 0.75, 1.0] as const;

export function TransportBar() {
  const setAudio = useStore((s) => s.setAudio);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const audio = useStore((s) => s.audio);
  const currentTime = useStore((s) => s.currentTime);
  const playbackRate = useStore((s) => s.playbackRate);
  const setPlaybackRate = useStore((s) => s.setPlaybackRate);
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

  function onSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const r = parseFloat(e.target.value);
    setPlaybackRate(r);
    engine.setPlaybackRate(r);
  }

  return (
    <div className="transport">
      <input type="file" accept="audio/*" onChange={onFile} />
      <button className="btn" onClick={() => (playing ? engine.pause() : engine.play())}>
        {playing ? '⏸ 暫停' : '▶ 播放'}
      </button>
      <select value={playbackRate} onChange={onSpeedChange} style={{ fontSize: 13 }}>
        {SPEED_OPTIONS.map(r => (
          <option key={r} value={r}>{r === 1 ? '1× 正常' : `${r}× 慢速`}</option>
        ))}
      </select>
      <span>
        {currentTime.toFixed(2)}s / {audio?.durationSec.toFixed(2) ?? '0'}s
      </span>
      {audio && <span> — {audio.fileName}</span>}
    </div>
  );
}
