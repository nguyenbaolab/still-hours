import { describe, expect, it } from "vitest";
import { stageOf, validateMechanism } from "../../battle/mechanism";
import { validatePattern } from "../../battle/pattern-runner";
import { TempoMap } from "../../core/tempo-map";
import { BULLET_FEEL } from "../rhythm-feel";
import { POCKET_WATCH } from "../mechanisms/pocket-watch";
import type { Pattern } from "../pattern-types";
import { threat } from "../../testing/difficulty";
import { R1_BULLET_SPEED, R1_ROUNDS } from "./resident-1";

/** Tempo sau khi chạy hết sự kiện `tempo` của một lượt. */
function tempoOf(round: Pattern): TempoMap {
  const tempo = new TempoMap(round.bpm ?? 100);
  for (const event of round.events) if (event.type === "tempo") tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  return tempo;
}

describe("cư dân 1: tích tắc dồn dập", () => {
  it("ba lượt hợp lệ, kết thúc theo độ dài, không lặp", () => {
    for (const round of R1_ROUNDS) {
      expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
      expect(round.loop).toBe(false);
      expect(round.finish).toEqual({ kind: "length" });
    }
  });

  it("BPM tăng nhẹ: 88 → 98, 94 → 106, 100 → 114 (đã hạ so với 120 → 144, 132 → 160, 144 → 176); lượt 3 kết ở đúng 114", () => {
    const expected = [
      [88, 98, 44],
      [94, 106, 46],
      [100, 114, 50],
    ] as const;
    R1_ROUNDS.forEach((round, i) => {
      const [start, end, length] = expected[i] as readonly [number, number, number];
      const tempo = tempoOf(round);
      expect(round.bpm).toBe(start);
      expect(round.lengthBeats).toBe(length);
      expect(tempo.bpmAtBeat(0)).toBeCloseTo(start, 6);
      expect(tempo.bpmAtBeat(32)).toBeCloseTo(end, 6);
      expect(tempo.bpmAtBeat(round.lengthBeats)).toBeCloseTo(end, 6);
    });
    expect(tempoOf(R1_ROUNDS[2]).bpmAtBeat(R1_ROUNDS[2].lengthBeats)).toBeCloseTo(114, 6);
  });

  it("mỗi lượt dài 22–32 giây trên tempo kịch bản", () => {
    for (const round of R1_ROUNDS) {
      const seconds = tempoOf(round).scriptTimeAtBeat(round.lengthBeats);
      expect(seconds).toBeGreaterThan(22);
      expect(seconds).toBeLessThan(32);
    }
  });

  it("hai beat cuối để trống; tempo luôn tăng (không giảm giữa lượt)", () => {
    for (const round of R1_ROUNDS) {
      for (const event of round.events) expect(event.beat).toBeLessThanOrEqual(round.lengthBeats - 2);
      const tempo = tempoOf(round);
      let last = 0;
      for (let beat = 0; beat <= round.lengthBeats; beat += 1) {
        const bpm = tempo.bpmAtBeat(beat);
        expect(bpm).toBeGreaterThanOrEqual(last - 1e-9);
        last = bpm;
      }
    }
  });

  it("chuỗi straight cứ 2 beat xen hai bên; aimed thưa (cứ 8 beat); lượt 3 có đúng một sweep 30°/beat", () => {
    for (const round of R1_ROUNDS) {
      const chain = round.events.filter(
        (e) => e.type === "straight" && Number.isInteger(e.beat) && (e.from === "left" || e.from === "right"),
      );
      const beats = chain.map((e) => e.beat).sort((a, b) => a - b);
      expect(beats.length).toBeGreaterThan(15);
      for (let i = 1; i < beats.length; i++) expect(beats[i]).toBe((beats[i - 1] as number) + 2);
      // Xen trái / phải.
      chain.forEach((e, i) => {
        if (e.type === "straight") expect(e.from).toBe(i % 2 === 0 ? "left" : "right");
      });
      const aimed = round.events.filter((e) => e.type === "aimed");
      expect(aimed.length).toBeGreaterThanOrEqual(4);
      const aimedBeats = aimed.map((e) => e.beat);
      for (let i = 1; i < aimedBeats.length; i++) expect((aimedBeats[i] as number) - (aimedBeats[i - 1] as number)).toBe(8);
    }
    expect(R1_ROUNDS[0].events.some((e) => e.type === "sweep")).toBe(false);
    const sweeps = R1_ROUNDS[2].events.filter((e) => e.type === "sweep");
    expect(sweeps).toHaveLength(1);
    for (const e of sweeps) if (e.type === "sweep") expect(e.degreesPerBeat).toBe(30);
  });
});

describe("cư dân 1: đạn chậm", () => {
  it("mọi đạn thẳng và đạn nhắm bay R1_BULLET_SPEED (100), chậm hơn mặc định 140", () => {
    expect(R1_BULLET_SPEED).toBeLessThan(BULLET_FEEL.speed);
    for (const round of R1_ROUNDS) {
      for (const e of round.events) {
        if (e.type === "straight" || e.type === "aimed") expect(e.speed).toBe(R1_BULLET_SPEED);
      }
    }
  });
});

describe("cư dân 1: đồng hồ quả quýt", () => {
  it("hợp lệ, chậm và êm: không theo nhịp, 60 BPM, không có unscrew", () => {
    expect(validateMechanism(POCKET_WATCH)).toEqual([]);
    expect(POCKET_WATCH.rhythmic).toBe(false);
    expect(POCKET_WATCH.bpm).toBe(60);
    expect(POCKET_WATCH.parts.some((p) => p.operation === "unscrew")).toBe(false);
  });

  it("bốn câu ký ức theo thiết kế: một câu tầng 1, một tầng 2, hai tầng 3 (core là câu cuối)", () => {
    const memories = POCKET_WATCH.parts.filter((p) => p.memory);
    expect(memories.map((p) => stageOf(p))).toEqual([1, 2, 3, 3]);
    expect(memories.map((p) => p.memory)).toEqual([
      "Mâm cơm để phần, đã nguội.",
      "Ba cuộc gọi nhỡ. Con gái.",
      "Bánh sinh nhật chưa cắt.",
      "Con hỏi: mai ba có về không?",
    ]);
    expect(POCKET_WATCH.parts.find((p) => p.core)?.memory).toBe("Con hỏi: mai ba có về không?");
  });
});

describe("cư dân 1 là cư dân dễ nhất (gameplay-balance-v2)", () => {
  it("mỗi lượt có ít hơn 1,6 đạn trừ máu mỗi giây kịch bản (gốc 3,5 – 5,0; đợt 1 còn 0,9 – 2,1), tăng dần qua ba lượt", () => {
    const rates = R1_ROUNDS.map((round) => threat(round).perSecond);
    for (const rate of rates) expect(rate).toBeLessThan(1.6);
    expect(rates[0]).toBeLessThan(rates[1] as number);
    expect(rates[1]).toBeLessThan(rates[2] as number);
  });
});
