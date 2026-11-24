import type { AmbienceFeel } from "../data/flow-feel";

/** Lớp gió nền: nhiễu trắng lặp, lọc thấp, dập dềnh chậm. Bật/tắt dần bằng `setLevel`. */
export interface WindBed {
  /** Độ to đích (gain 0..1); 0 = im. Chuyển dần trong `fadeSeconds`. */
  setLevel(level: number, fadeSeconds: number): void;
}

const BUFFER_SECONDS = 3;

/**
 * Gió của thị trấn, tổng hợp bằng WebAudio. Nguồn nhiễu chạy liên tục từ lúc tạo (gain 0 nên không nghe thấy),
 * nên bật/tắt chỉ là đổi gain. Gain tổng của AudioEngine quyết định tắt tiếng.
 */
export function createWindBed(ctx: AudioContext, destination: AudioNode, feel: AmbienceFeel): WindBed {
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * BUFFER_SECONDS), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = feel.windLowpassHz;
  filter.Q.value = 0.4;

  // Dập dềnh: một nguồn sóng rất chậm nhân vào gain của lớp gió.
  const swell = ctx.createGain();
  swell.gain.value = 1 - feel.windSwellDepth / 2;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 1 / feel.windSwellSeconds;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = feel.windSwellDepth / 2;
  lfo.connect(lfoDepth).connect(swell.gain);

  const level = ctx.createGain();
  level.gain.value = 0;

  source.connect(filter).connect(swell).connect(level).connect(destination);
  source.start();
  lfo.start();

  return {
    setLevel(target: number, fadeSeconds: number): void {
      level.gain.cancelScheduledValues(ctx.currentTime);
      level.gain.setTargetAtTime(Math.max(0, target), ctx.currentTime, Math.max(0.01, fadeSeconds / 3));
    },
  };
}