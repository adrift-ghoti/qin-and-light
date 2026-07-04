/**
 * 封裝 Web Audio:載入並解碼音檔、播放/暫停、提供精確的播放時間。
 * 時鐘以 AudioContext.currentTime 為基準,避免 setInterval 漂移。
 */
export class AudioEngine {
  private ctx = new AudioContext();
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtCtxTime = 0; // 開始播放時的 ctx.currentTime
  private startOffset = 0;      // 從音檔的哪個位置開始(秒)
  private playing = false;

  async loadFile(file: File): Promise<{ durationSec: number; sampleRate: number }> {
    const arrayBuf = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuf);
    this.startOffset = 0;
    return { durationSec: this.buffer.duration, sampleRate: this.buffer.sampleRate };
  }

  play(): void {
    if (!this.buffer || this.playing) return;
    this.ctx.resume();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.ctx.destination);
    src.start(0, this.startOffset);
    this.source = src;
    this.startedAtCtxTime = this.ctx.currentTime;
    this.playing = true;
    // stop() 觸發的 onended 是非同步的:seek() 會先 stop() 舊 source 再立刻建立新 source,
    // 若這裡只檢查 this.playing,舊 source 延遲觸發的 onended 會誤判「該暫停了」,
    // 把剛開始播放的新 source 也一併停掉。用 this.source === src 確認事件來自目前正在播放的
    // source(代表音檔真的自然播完),而非被 seek/pause 換掉的舊 source。
    src.onended = () => { if (this.source === src && this.playing) this.pause(); };
  }

  pause(): void {
    if (!this.playing) return;
    this.startOffset = this.getTime();
    this.source?.stop();
    this.source = null;
    this.playing = false;
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.startOffset = Math.max(0, seconds);
    if (wasPlaying) this.play();
  }

  /** 目前播放位置(秒),樣本級精確 */
  getTime(): number {
    if (!this.playing) return this.startOffset;
    return this.startOffset + (this.ctx.currentTime - this.startedAtCtxTime);
  }

  isPlaying(): boolean { return this.playing; }
  get duration(): number { return this.buffer?.duration ?? 0; }
}
