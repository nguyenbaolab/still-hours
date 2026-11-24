import type { AudioFeel } from "../data/rhythm-feel";
import type { TickKind, TickSink } from "./tick-scheduler";

/**
 * Tiếng đồng hồ cơ, tổng hợp bằng WebAudio (không dùng file). Mỗi tiếng gồm ba lớp rất ngắn:
 *  - "click": một nhát nhiễu trắng lọc dải, tạo cảm giác bánh răng chạm cựa;
 *  - "tone": âm sin cao độ `hz`, tụt nhẹ xuống, là phần "nghe ra nốt";
 *  - "body": âm sin trầm ngắn, cho độ ấm như vỏ gỗ.
 * Tiếng rất ngắn (dưới 0,1 giây), lên nhanh 1 ms để không bị "bốp", rồi qua bộ lọc cắt cao để không chói tai.
 * Sau này muốn dùng file thật: viết một TickSink khác phát AudioBuffer, bộ lên lịch giữ nguyên.
 */

const NOISE_SECONDS = 0.05;
const FLOOR = 0.0001; // exponentialRamp không đi từ/đến 0 được

/** Giọng riêng của một sink: `gain` nhân vào độ to, `softnessHz` thay cho `feel.softnessHz` (tiếng tích xa: nhỏ và đục). */
export interface TickVoice {
  gain: number;
  softnessHz: number;
}

export function createTickSink(ctx: AudioContext, destination: AudioNode, feel: AudioFeel, voice?: TickVoice): TickSink {
  const bus = ctx.createBiquadFilter();
  bus.type = "lowpass";
  bus.frequency.value = voice?.softnessHz ?? feel.softnessHz;
  bus.Q.value = 0.5;
  if (voice) {
    const level = ctx.createGain();
    level.gain.value = voice.gain;
    level.connect(destination);
    bus.connect(level);
  } else {
    bus.connect(destination);
  }

  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  /** Đường bao: lên nhanh tới `peak` rồi tắt theo hàm mũ sau `decay` giây. */
  const envelope = (time: number, peak: number, decay: number): GainNode => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(FLOOR, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(FLOOR, time + decay);
    gain.connect(bus);
    return gain;
  };

  return {
    play(time: number, kind: TickKind): { cancel(): void } {
      const hz = kind === "tick" ? feel.tickHz : feel.tockHz;

      const click = ctx.createBufferSource();
      click.buffer = noise;
      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = "bandpass";
      clickFilter.frequency.value = hz * 2;
      clickFilter.Q.value = 1.2;
      click.connect(clickFilter).connect(envelope(time, 0.35, 0.02));

      const tone = ctx.createOscillator();
      tone.type = "sine";
      tone.frequency.setValueAtTime(hz, time);
      tone.frequency.exponentialRampToValueAtTime(hz * 0.75, time + 0.045);
      tone.connect(envelope(time, 0.3, 0.06));

      const body = ctx.createOscillator();
      body.type = "sine";
      body.frequency.value = hz * 0.25;
      body.connect(envelope(time, 0.22, 0.035));

      click.start(time);
      click.stop(time + NOISE_SECONDS);
      tone.start(time);
      tone.stop(time + 0.07);
      body.start(time);
      body.stop(time + 0.05);

      return {
        cancel() {
          // Tiếng chưa tới giờ phát thì dừng ngay là không bao giờ phát; đã phát rồi thì thôi.
          for (const source of [click, tone, body]) {
            try {
              source.stop(0);
            } catch {
              /* đã dừng */
            }
          }
        },
      };
    },
  };
}
