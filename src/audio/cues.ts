/**
 * Tiếng phản hồi ngắn, tổng hợp bằng WebAudio, đi qua cùng gain tổng với tiếng tích tắc
 * nên tắt tiếng (M) là tắt luôn. Không hẹn trước: phát đúng lúc người chơi vừa ôm hoặc vừa nhả một câu.
 */

const FLOOR = 0.0001;

/** Mọi tiếng phản hồi. Danh sách dạng mảng để test chạy qua từng tiếng một. */
export const CUE_NAMES = [
  "wordAbsorb",
  "wordRelease",
  "unscrew",
  "lift",
  "unhook",
  "clack",
  "pencilUp",
  "pencilDrop",
  "drawTick",
  "mend",
  "blip",
  "ring",
  "hum",
  "bird",
  "chime",
] as const;

export type CueName = (typeof CUE_NAMES)[number];

/** `hz`: cao độ riêng của tiếng (chỉ `blip` dùng: mỗi người nói một cao độ). */
export function playCue(ctx: AudioContext, destination: AudioNode, cue: CueName, time: number, hz?: number): void {
  if (cue === "blip") blip(ctx, destination, time, hz ?? 440);
  else if (cue === "ring") ring(ctx, destination, time);
  else if (cue === "hum") hum(ctx, destination, time);
  else if (cue === "bird") bird(ctx, destination, time);
  else if (cue === "chime") chime(ctx, destination, time);
  else if (cue === "wordAbsorb") thud(ctx, destination, time);
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

/** Tiếng chữ hiện ra trong hội thoại: một nốt vuông rất ngắn, mềm. */
function blip(ctx: AudioContext, destination: AudioNode, time: number, hz: number): void {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(hz, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(0.07, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + 0.045);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  osc.connect(filter).connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

/** Một nốt sin có bao: lên nhanh, tắt dần. */
function tone(ctx: AudioContext, destination: AudioNode, time: number, hz: number, seconds: number, peak: number, type: OscillatorType = "sine"): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(FLOOR, time + seconds);
  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(time + seconds + 0.02);
}

/** Chuông điện thoại chờ máy: hai hồi "rrrr" ngắn (hai nốt xen nhau), một lần phát là một hồi chuông. */
function ring(ctx: AudioContext, destination: AudioNode, time: number): void {
  for (let burst = 0; burst < 2; burst++) {
    const start = time + burst * 0.42;
    for (let i = 0; i < 8; i++) {
      tone(ctx, destination, start + i * 0.045, i % 2 === 0 ? 880 : 1040, 0.04, 0.09, "square");
    }
  }
}

/** Ngân nga khẽ: bốn nốt sin mềm, mỗi nốt kéo dài, nối nhau. */
function hum(ctx: AudioContext, destination: AudioNode, time: number): void {
  const notes = [330, 392, 349, 294];
  notes.forEach((hz, i) => tone(ctx, destination, time + i * 0.5, hz, 0.55, 0.16));
}

/** Tiếng chim: ba tiếng hót ngắn, mỗi tiếng vút lên. */
function bird(ctx: AudioContext, destination: AudioNode, time: number): void {
  for (let i = 0; i < 3; i++) {
    const start = time + i * 0.14;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2800 + i * 300, start);
    osc.frequency.exponentialRampToValueAtTime(4000 + i * 300, start + 0.07);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(FLOOR, start);
    gain.gain.exponentialRampToValueAtTime(0.05, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(FLOOR, start + 0.09);
    osc.connect(gain).connect(destination);
    osc.start(start);
    osc.stop(start + 0.1);
  }
}

/** Chuông đồng hồ: một tiếng ngân dài, hai bội âm. */
function chime(ctx: AudioContext, destination: AudioNode, time: number): void {
  tone(ctx, destination, time, 660, 1.4, 0.16);
  tone(ctx, destination, time, 990, 1.0, 0.08);
  tone(ctx, destination, time, 1650, 0.6, 0.04);
}