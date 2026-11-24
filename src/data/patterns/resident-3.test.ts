import { describe, expect, it } from "vitest";
import { stageOf, validateMechanism } from "../../battle/mechanism";
import { Pace } from "../../battle/pace";
import { validatePattern } from "../../battle/pattern-runner";
import { lagClockHands } from "../../battle/lag-clock";
import { TempoMap } from "../../core/tempo-map";
import { METRONOME } from "../mechanisms/metronome";
import { BULLET_FEEL, LAG_CLOCK_FEEL, PACE_FEEL, RHYTHM_FEEL } from "../rhythm-feel";
import type { Pattern } from "../pattern-types";
import { NEGATIVE_PHRASES } from "../words";
import { R3_ROUNDS } from "./resident-3";

const wordBeats = (round: Pattern): number[] => round.events.filter((e) => e.type === "word").map((e) => e.beat);

/** Ôm các câu có chỉ số `eat` (theo thứ tự xuất hiện), né các câu còn lại; trả về giờ nghe được và giờ kịch bản của lượt. */
function playRound(round: Pattern, eat: (index: number) => boolean): { heard: number; script: number } {
  const tempo = new TempoMap(round.bpm ?? 100);
  const pace = new Pace(tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
  wordBeats(round).forEach((beat, i) => {
    if (eat(i)) pace.absorb(beat);
    else pace.release(beat);
    pace.update(beat);
  });
  pace.update(round.lengthBeats);
  return { heard: tempo.timeAtBeat(round.lengthBeats), script: tempo.scriptTimeAtBeat(round.lengthBeats) };
}

describe("cư dân 3: lời tiêu cực làm chậm nhịp", () => {
  it("ba lượt hợp lệ, 100 BPM, 48 / 52 / 56 beat, có mặt đồng hồ trễ, kết theo độ dài", () => {
    expect(R3_ROUNDS.map((r) => r.lengthBeats)).toEqual([48, 52, 56]);
    for (const round of R3_ROUNDS) {
      expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
      expect(round.bpm).toBe(100);
      expect(round.lagClock).toBe(true);
      expect(round.loop).toBe(false);
      expect(round.finish).toEqual({ kind: "length" });
      expect(round.still).toBeUndefined();
    }
  });

  it("mỗi lượt có đạn thường trừ máu (straight, aimed), thưa hơn chữ, và có cả chữ", () => {
    for (const round of R3_ROUNDS) {
      const words = round.events.filter((e) => e.type === "word");
      const damaging = round.events.filter((e) => e.type === "straight" || e.type === "aimed");
      expect(words.length).toBeGreaterThan(8);
      expect(damaging.length).toBeGreaterThan(5);
      expect(damaging.length).toBeLessThan(words.length);
      expect(damaging.some((e) => e.type === "aimed")).toBe(true);
      expect(damaging.some((e) => e.type === "straight")).toBe(true);
    }
  });

  it("hai beat cuối trở đi để trống", () => {
    for (const round of R3_ROUNDS) for (const e of round.events) expect(e.beat).toBeLessThanOrEqual(round.lengthBeats - 3);
  });

  it("ôm hết mọi câu: lượt dài tối đa 1 / 0,7 ≈ 1,43 lần kịch bản (cộng một beat)", () => {
    for (const round of R3_ROUNDS) {
      const { heard, script } = playRound(round, () => true);
      const oneBeat = 60 / (round.bpm ?? 100);
      expect(heard).toBeGreaterThan(script * 1.3);
      expect(heard).toBeLessThanOrEqual(script / 0.7 + oneBeat);
    }
  });

  it("ôm khoảng một nửa: không dài quá ~1,25 lần; né hết thì đúng kịch bản", () => {
    for (const round of R3_ROUNDS) {
      const half = playRound(round, (i) => i % 2 === 0);
      expect(half.heard / half.script).toBeLessThan(1.25);
      const none = playRound(round, () => false);
      expect(none.heard).toBeCloseTo(none.script, 9);
    }
  });

  it("câu thật: mọi câu của chữ có trong danh sách, đúng tám câu theo thiết kế", () => {
    expect(NEGATIVE_PHRASES).toEqual([
      "hát gì mà hát",
      "ai thèm nghe",
      "lo học đi",
      "mơ mộng hão",
      "để người khác lo",
      "biết thân biết phận",
      "chẳng ra gì",
      "phí thời gian",
    ]);
    for (const round of R3_ROUNDS) {
      for (const e of round.events) if (e.type === "word") expect(NEGATIVE_PHRASES[e.phrase]).toBeDefined();
    }
  });
});

describe("mặt đồng hồ trễ", () => {
  it("kim sáng tụt sau kim mờ đúng bằng (giờ thật − giờ kịch bản) quy ra độ", () => {
    const tempo = new TempoMap(100);
    tempo.setPace(4, 0.7);
    const beat = 20;
    const time = tempo.timeAtBeat(beat);
    const scriptTime = tempo.scriptTimeAtBeat(beat);
    expect(time).toBeGreaterThan(scriptTime);
    const hands = lagClockHands(time, scriptTime, LAG_CLOCK_FEEL.secondsPerTurn);
    expect(hands.real - hands.script).toBeCloseTo(((time - scriptTime) / LAG_CLOCK_FEEL.secondsPerTurn) * 360, 9);
    expect(hands.lagDeg).toBeCloseTo((time - scriptTime) * 6, 9);
    expect(hands.real).toBeGreaterThan(hands.script);
  });

  it("không ôm câu nào thì hai kim trùng nhau; một vòng = 60 giây", () => {
    const tempo = new TempoMap(100);
    const hands = lagClockHands(tempo.timeAtBeat(30), tempo.scriptTimeAtBeat(30), 60);
    expect(hands.lagDeg).toBeCloseTo(0, 9);
    expect(hands.real).toBeCloseTo(hands.script, 9);
    expect(lagClockHands(15, 15, 60).real).toBeCloseTo(90, 9);
    expect(lagClockHands(60, 60, 60).real).toBeCloseTo(0, 9);
  });

  it("trước beat 0 (dạo đầu, thời gian âm) kim đứng ở 0", () => {
    const hands = lagClockHands(-1.2, 0, 60);
    expect(hands.real).toBe(0);
    expect(hands.lagDeg).toBeCloseTo(0, 9);
  });
});

describe("cư dân 3: máy đếm nhịp", () => {
  it("hợp lệ, theo nhịp 88 BPM", () => {
    expect(validateMechanism(METRONOME)).toEqual([]);
    expect(METRONOME.rhythmic).toBe(true);
    expect(METRONOME.bpm).toBe(88);
  });

  it("bốn câu ký ức theo thiết kế (một / một / hai, core cuối)", () => {
    const memories = METRONOME.parts.filter((p) => p.memory);
    expect(memories.map((p) => stageOf(p))).toEqual([1, 2, 3, 3]);
    expect(memories.map((p) => p.memory)).toEqual([
      "Sân khấu trường, tràng vỗ tay đầu tiên.",
      "Cây đàn trên nóc tủ.",
      "Bài hát viết dở.",
      "Giọng mình. Lâu rồi không nghe.",
    ]);
  });
});