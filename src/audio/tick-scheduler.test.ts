import { describe, expect, it } from "vitest";
import { BeatClock } from "../core/beat-clock";
import { fixtureTime } from "../testing/fixtures";
import { FakeAudio, simulate } from "../testing/sim";
import { TickScheduler } from "./tick-scheduler";

const ORIGIN = 7; // beat 0 diễn ra ở giờ AudioContext = 7 s

function setup(bpm: number) {
  const audio = new FakeAudio(5, 0.03);
  const clock = new BeatClock(audio, bpm, ORIGIN);
  const scheduler = new TickScheduler(clock, () => audio.contextTime(), audio.tickSink);
  /** Việc game làm mỗi tick: đọc đồng hồ nhịp rồi lên lịch tiếng. */
  const frame = (): void => {
    clock.update();
    scheduler.update();
  };
  return { audio, clock, scheduler, frame };
}

const beatOf = (clock: BeatClock, time: number): number => Math.round(clock.tempo.beatAtTime(time - clock.origin));

describe("TickScheduler: lên lịch tiếng tích tắc bằng giờ của AudioContext", () => {
  it("hẹn mỗi beat đúng lúc origin + thời gian lý thuyết của beat đó (tempo đổi dần, jitter khung hình)", () => {
    const { audio, clock, frame } = setup(100);
    // Cùng kịch bản tempo với SYNC_FIXTURE trong một vòng: tăng dần, giữ, giảm dần.
    clock.tempo.change(8, 160, 8);
    clock.tempo.change(20, 100, 4);

    simulate({ seconds: 14, audio, step: frame });

    const played = audio.plays.filter((p) => !p.cancelled);
    expect(played.length).toBeGreaterThan(20);
    for (const p of played) {
      const beat = beatOf(clock, p.time);
      expect(p.time).toBeCloseTo(ORIGIN + fixtureTime(beat), 6);
    }
  });

  it("tích ở beat chẵn, tắc ở beat lẻ; mỗi beat đúng một lần; không bỏ sót khi không giật", () => {
    const { audio, clock, frame } = setup(120);
    simulate({ seconds: 20, audio, step: frame });

    const played = audio.plays.filter((p) => !p.cancelled);
    const beats = played.map((p) => beatOf(clock, p.time));
    expect(beats).toEqual(beats.map((_, i) => i)); // 0, 1, 2, ... liên tục, không trùng
    for (const p of played) expect(p.kind).toBe(beatOf(clock, p.time) % 2 === 0 ? "tick" : "tock");
  });

  it("gọi update() nhiều lần trong cùng một khung hình không làm phát đôi", () => {
    const { audio, clock, scheduler } = setup(120);
    simulate({
      seconds: 10,
      audio,
      step: () => {
        clock.update();
        for (let i = 0; i < 5; i++) scheduler.update();
      },
    });
    const beats = audio.plays.filter((p) => !p.cancelled).map((p) => beatOf(clock, p.time));
    expect(new Set(beats).size).toBe(beats.length);
  });

  describe("khi khung hình bị treo 1 giây", () => {
    const { audio, clock, frame } = setup(100);
    simulate({ seconds: 30, audio, stall: { at: 12, length: 1 }, step: frame });
    const played = audio.plays.filter((p) => !p.cancelled);
    const beats = new Set(played.map((p) => beatOf(clock, p.time)));

    it("không phát vào quá khứ: tiếng chưa tới giờ thì hẹn đúng giờ, đã trễ nhiều thì bỏ", () => {
      for (const p of audio.plays) expect(p.time).toBeGreaterThanOrEqual(p.calledAt - 1e-9);
    });

    it("chỉ bỏ những beat rơi vào lúc treo, mọi beat còn lại vẫn đúng lưới (không dồn cục, không lệch pha)", () => {
      const missing: number[] = [];
      for (let beat = 0; beat <= Math.max(...beats); beat++) if (!beats.has(beat)) missing.push(beat);
      expect(missing.length).toBeGreaterThanOrEqual(1);
      expect(missing.length).toBeLessThanOrEqual(3);
      for (const beat of missing) {
        const ctxTime = ORIGIN + clock.tempo.timeAtBeat(beat);
        expect(ctxTime).toBeGreaterThan(5 + 12); // nằm trong khoảng treo (5 là giờ bắt đầu của đồng hồ giả)
        expect(ctxTime).toBeLessThan(5 + 14);
      }
      for (const p of played) expect(p.time).toBeCloseTo(ORIGIN + clock.tempo.timeAtBeat(beatOf(clock, p.time)), 9);
    });
  });

  it("đổi tempo giữa trận: hủy tiếng đã hẹn theo tempo cũ, hẹn lại đúng nhịp mới, không phát đôi", () => {
    const { audio, clock, scheduler } = setup(120);
    let changed = false;
    simulate({
      seconds: 30,
      audio,
      jitter: 0.002,
      step: () => {
        clock.update();
        scheduler.update();
        // 20,7: lúc đổi, beat 21 (còn 0,15 s) đã được hẹn trong cửa sổ lên lịch trước nên phải bị hủy và hẹn lại.
        if (!changed && clock.beat >= 20.7) {
          changed = true;
          clock.tempo.change(clock.beat, 60, 0);
        }
      },
    });

    expect(audio.plays.some((p) => p.cancelled)).toBe(true);
    const played = audio.plays.filter((p) => !p.cancelled);
    // Không thủng beat nào, kể cả beat đã hẹn theo tempo cũ rồi bị hủy (phải được hẹn lại theo tempo mới).
    const beats = played.map((p) => beatOf(clock, p.time));
    for (let beat = 0; beat <= 30; beat++) expect(beats).toContain(beat);
    const times = played.map((p) => p.time).sort((a, b) => a - b);
    const gaps = times.slice(1).map((time, i) => time - (times[i] as number));
    expect(Math.min(...gaps)).toBeGreaterThan(0.45); // không có hai tiếng dính nhau
    const after = played.filter((p) => beatOf(clock, p.time) > 22);
    for (let i = 1; i < after.length; i++) {
      expect((after[i] as (typeof after)[number]).time - (after[i - 1] as (typeof after)[number]).time).toBeCloseTo(1, 6);
    }
  });

  it("không có nơi phát tiếng (trình duyệt không hỗ trợ): vẫn chạy, không lỗi", () => {
    const audio = new FakeAudio();
    const clock = new BeatClock(audio, 100, ORIGIN);
    const scheduler = new TickScheduler(clock, () => audio.contextTime(), null);
    const frame = (): void => {
      clock.update();
      scheduler.update();
    };
    expect(() => simulate({ seconds: 5, audio, step: frame })).not.toThrow();
  });
});
