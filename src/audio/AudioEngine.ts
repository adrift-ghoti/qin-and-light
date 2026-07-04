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
    src.onended = () => { if (this.playing) this.pause(); };
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
