import { describe, expect, it } from "vitest";
import { simpson } from "../testing/sim";
import { TempoMap } from "./tempo-map";

describe("TempoMap", () => {
  it("BPM không đổi: 120 BPM là 0,5 giây mỗi beat, kể cả trước beat 0", () => {
    const tempo = new TempoMap(120);
    expect(tempo.timeAtBeat(8)).toBeCloseTo(4, 12);
    expect(tempo.beatAtTime(4)).toBeCloseTo(8, 12);
    expect(tempo.timeAtBeat(-2)).toBeCloseTo(-1, 12);
  });

  describe("công thức đóng khớp tích phân số độc lập", () => {
    // 100 → ramp lên 180 trong 20 beat (beat 10–30), giữ, hạ ngay xuống 60 tại beat 40, ramp lên 120 trong 5 beat từ beat 50.
    const tempo = new TempoMap(100);
    tempo.change(10, 180, 20);
    tempo.change(40, 60, 0);
    tempo.change(50, 120, 5);
    const bpmAt = (b: number): number =>
      b < 10 ? 100 : b < 30 ? 100 + 4 * (b - 10) : b < 40 ? 180 : b < 50 ? 60 : b < 55 ? 60 + 12 * (b - 50) : 120;

    /** Giây tới `beat`: tích phân từng đoạn mượt, lấy giới hạn trái tại đầu mút phải (BPM nhảy bậc ở beat 40). */
    const integral = (beat: number): number => {
      const knots = [0, 10, 30, 40, 50, 55].filter((k) => k < beat);
      let seconds = 0;
      knots.forEach((from, i) => {
        const to = Math.min(beat, knots[i + 1] ?? beat);
        seconds += simpson((x) => 60 / bpmAt(Math.min(x, to - 1e-9)), from, to, 20000);
      });
      return seconds;
    };

    it.each([0, 3, 10, 10.5, 17.3, 29.99, 30, 35, 40, 44, 50, 52.5, 55, 60, 100])("beat %d", (beat) => {
      expect(tempo.timeAtBeat(beat)).toBeCloseTo(integral(beat), 6);
      expect(tempo.beatAtTime(tempo.timeAtBeat(beat))).toBeCloseTo(beat, 9);
      expect(tempo.bpmAtBeat(beat)).toBeCloseTo(bpmAt(beat), 9);
    });

    it("thời gian luôn tăng theo beat và liên tục tại các điểm nối giữa đoạn", () => {
      let previous = -Infinity;
      for (let beat = 0; beat < 80; beat += 0.01) {
        const time = tempo.timeAtBeat(beat);
        expect(time).toBeGreaterThan(previous);
        previous = time;
      }
      for (const joint of [10, 30, 40, 50, 55]) {
        expect(tempo.timeAtBeat(joint - 1e-9)).toBeCloseTo(tempo.timeAtBeat(joint + 1e-9), 6);
      }
    });
  });

  describe("change() giữa trận", () => {
    it("giữ nguyên vị trí beat hiện tại (không nhảy), tempo mới áp dụng từ đó", () => {
      const tempo = new TempoMap(100);
      const now = tempo.timeAtBeat(8);
      tempo.change(8, 50, 0);
      expect(tempo.beatAtTime(now)).toBeCloseTo(8, 12);
      expect(tempo.timeAtBeat(9)).toBeCloseTo(now + 1.2, 12);
    });

    it("tăng `version` mỗi lần đổi, để bộ lên lịch biết mà hẹn lại", () => {
      const tempo = new TempoMap(100);
      const before = tempo.version;
      tempo.change(4, 120, 0);
      expect(tempo.version).toBeGreaterThan(before);
    });

    it("đổi giữa lúc đang tăng dần thì lấy BPM tại điểm đó làm điểm xuất phát", () => {
      const tempo = new TempoMap(100);
      tempo.change(0, 200, 10); // 100 → 200 trong 10 beat
      tempo.change(5, 50, 0); // đổi ngay ở giữa dốc, khi đang là 150 BPM
      expect(tempo.bpmAtBeat(4.999)).toBeCloseTo(150, 1);
      expect(tempo.bpmAtBeat(6)).toBe(50);
    });
  });

  describe("setPace: hệ số hằng nhân lên BPM kịch bản", () => {
    it("bước nhảy 0,5, không phải dốc tuyến tính từ 1 xuống 0,5", () => {
      const tempo = new TempoMap(100);
      tempo.setPace(10, 0.5);
      tempo.setPace(30, 0.8); // mốc sau để khúc 10–30 hữu hạn; dốc hệ số trên khúc đó sẽ ra giờ khác
      // 0–10 ở 100 BPM (0,6 s/beat), 10–30 ở 50 BPM (1,2 s/beat).
      const step = 10 * 0.6 + 20 * 1.2;
      // Dốc hệ số 1 → 0,5 trên cùng khúc: BPM 100 → 50, k = -2,5.
      const ramp = 10 * 0.6 + (60 / -2.5) * Math.log(1 + (-2.5 * 20) / 100);
      expect(tempo.timeAtBeat(30)).toBeCloseTo(step, 9);
      expect(Math.abs(tempo.timeAtBeat(30) - ramp)).toBeGreaterThan(1);
      expect(tempo.bpmAtBeat(20)).toBeCloseTo(50, 9);
      expect(tempo.scriptTimeAtBeat(30)).toBeCloseTo(18, 9);
      expect(tempo.paceAtBeat(20)).toBe(0.5);
      expect(tempo.paceAtBeat(30)).toBe(0.8);
    });

    it("dốc BPM kịch bản nhân hệ số hằng khớp tích phân độc lập", () => {
      const tempo = new TempoMap(100);
      tempo.change(0, 200, 10); // kịch bản 100 → 200
      tempo.setPace(0, 0.5); // hiệu dụng 50 → 100, t = 12·ln(2)
      const effective = (beat: number): number => (beat < 10 ? (100 + 10 * beat) * 0.5 : 100);
      const integral = (beat: number): number => {
        const cut = Math.min(beat, 10);
        let seconds = cut > 0 ? simpson((x) => 60 / effective(Math.min(x, cut - 1e-9)), 0, cut, 20000) : 0;
        if (beat > 10) seconds += ((beat - 10) * 60) / 100;
        return seconds;
      };
      expect(tempo.timeAtBeat(10)).toBeCloseTo(12 * Math.log(2), 9);
      expect(tempo.timeAtBeat(10)).toBeCloseTo(integral(10), 6);
      expect(tempo.timeAtBeat(16)).toBeCloseTo(integral(16), 6);
    });

    it("change không xóa hệ số, và thời gian trước mốc không nhảy", () => {
      const tempo = new TempoMap(100);
      tempo.setPace(4, 0.5);
      const now = tempo.timeAtBeat(8);
      tempo.change(12, 80, 0);
      expect(tempo.paceAtBeat(6)).toBe(0.5);
      expect(tempo.bpmAtBeat(6)).toBe(50);
      expect(tempo.timeAtBeat(8)).toBeCloseTo(now, 9);
      expect(tempo.beatAtTime(now)).toBeCloseTo(8, 9);
    });

    it("từ chối hệ số ngoài (0, 1], và không tăng version khi không đổi gì", () => {
      const tempo = new TempoMap(100);
      expect(() => tempo.setPace(0, 1.2)).toThrow(/\(0, 1]/);
      expect(() => tempo.setPace(0, 0)).toThrow();
      expect(() => tempo.setPace(0, -0.2)).toThrow();
      expect(() => tempo.setPace(-1, 0.5)).toThrow();
      const version = tempo.version;
      tempo.setPace(0, 1);
      tempo.setPace(4, 1);
      expect(tempo.version).toBe(version);
      tempo.setPace(4, 0.8);
      expect(tempo.version).toBeGreaterThan(version);
    });
  });

  it("từ chối BPM và beat không hợp lệ", () => {
    expect(() => new TempoMap(0)).toThrow();
    expect(() => new TempoMap(Number.NaN)).toThrow();
    const tempo = new TempoMap(100);
    expect(() => tempo.change(4, -10)).toThrow();
    expect(() => tempo.change(-1, 100)).toThrow();
    expect(() => tempo.change(4, 100, -2)).toThrow();
  });
});
