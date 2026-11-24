/**
 * Tiếng phản hồi ngắn, tổng hợp bằng WebAudio, đi qua cùng gain tổng với tiếng tích tắc
 * nên tắt tiếng (M) là tắt luôn. Không hẹn trước: phát đúng lúc người chơi vừa ôm hoặc vừa nhả một câu.
 */

const FLOOR = 0.0001;

export type CueName =
  | "wordAbsorb"
  | "wordRelease"
  | "unscrew"
  | "lift"
  | "unhook"
  | "clack"
  | "pencilUp"
  | "pencilDrop"
  | "drawTick"
  | "mend";

export function playCue(ctx: AudioContext, destination: AudioNode, cue: CueName, time: number): void {
  if (cue === "wordAbsorb") thud(ctx, destination, time);
  else if (cue === "wordRelease") breath(ctx, destination, time);
  else if (cue === "unscrew") click(ctx, destination, time, 1400);
  else if (cue === "lift") scrape(ctx, destination, time);
  else if (cue === "unhook") click(ctx, destination, time, 880);
  else if (cue === "pencilUp") scratch(ctx, destination, time, 3200, 0.1, 0.1);
  else if (cue === "pencilDrop") pencilDrop(ctx, destination, time);
  else if (cue === "drawTick") scratch(ctx, destination, time, 5200, 0.03, 0.035);
  else if (cue === "mend") {
    // Một tiếng cạch nhỏ (vết nứt khép lại), rồi một tiếng tích.
    click(ctx, destination, time, 700);
    click(ctx, destination, time + 0.22, 1800);
  }
  else knock(ctx, destination, time);
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

/** Một tiếng kim loại ngắn: vặn một nấc, hoặc móc vừa rời (nốt thấp hơn). */
function click(ctx: AudioContext, destination: AudioNode, time: number, hz: number): void {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(hz, time);
  osc.frequency.exponentialRampToValueAtTime(hz / 2, time + 0.04);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.18, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  osc.connect(filter).connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

/** Nhấc: một nhát gỗ ngắn, trầm hơn tiếng vặn. */
function scrape(ctx: AudioContext, destination: AudioNode, time: number): void {
  const seconds = 0.12;
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, time);
  filter.frequency.exponentialRampToValueAtTime(280, time + seconds);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.22, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + seconds);
  source.connect(filter).connect(gain).connect(destination);
  source.start(time);
  source.stop(time + seconds);
}

/** Lệch nhịp: một cú gõ đục, không có tiếng kim loại. */
function knock(ctx: AudioContext, destination: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, time);
  osc.frequency.exponentialRampToValueAtTime(55, time + 0.08);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.4, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + 0.09);
  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.1);
}

/** Chì chạm giấy: một vệt nhiễu ngắn, sáng. `peak` là biên độ đỉnh. */
function scratch(ctx: AudioContext, destination: AudioNode, time: number, hz: number, seconds: number, peak: number): void {
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz;
  filter.Q.value = 1.1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + seconds);
  source.connect(filter).connect(gain).connect(destination);
  source.start(time);
  source.stop(time + seconds);
}

/** Bút rơi: hai cái gõ gỗ nhỏ, cái sau nhẹ hơn và cao hơn. */
function pencilDrop(ctx: AudioContext, destination: AudioNode, time: number): void {
  const taps = [
    { at: 0, hz: 520, peak: 0.3 },
    { at: 0.07, hz: 700, peak: 0.16 },
  ];
  for (const tap of taps) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(tap.hz, time + tap.at);
    osc.frequency.exponentialRampToValueAtTime(tap.hz / 2, time + tap.at + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(FLOOR, time + tap.at);
    gain.gain.exponentialRampToValueAtTime(tap.peak, time + tap.at + 0.003);
    gain.gain.exponentialRampToValueAtTime(FLOOR, time + tap.at + 0.06);
    osc.connect(gain).connect(destination);
    osc.start(time + tap.at);
    osc.stop(time + tap.at + 0.07);
  }
}
