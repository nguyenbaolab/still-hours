/**
 * Tiếng phản hồi ngắn, tổng hợp bằng WebAudio, đi qua cùng gain tổng với tiếng tích tắc
 * nên tắt tiếng (M) là tắt luôn. Không hẹn trước: phát đúng lúc người chơi vừa ôm hoặc vừa nhả một câu.
 */

const FLOOR = 0.0001;

export type CueName = "wordAbsorb" | "wordRelease";

export function playCue(ctx: AudioContext, destination: AudioNode, cue: CueName, time: number): void {
  if (cue === "wordAbsorb") {
    thud(ctx, destination, time);
    return;
  }
  breath(ctx, destination, time);
}

/** "Ôm" một câu: một nhịp trầm cụp xuống, nghe ra ngay là vừa đỡ trúng. */
function thud(ctx: AudioContext, destination: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(196, time);
  osc.frequency.exponentialRampToValueAtTime(78, time + 0.14);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.45, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + 0.16);
  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.18);
}

/** "Nhả": một hơi gió rất nhẹ khi câu đi hết khung mà không chạm. */
function breath(ctx: AudioContext, destination: AudioNode, time: number): void {
  const seconds = 0.09;
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.12, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + seconds);
  source.connect(filter).connect(gain).connect(destination);
  source.start(time);
  source.stop(time + seconds);
}
