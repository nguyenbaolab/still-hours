import { describe, expect, it } from "vitest";
import { TempoMap } from "../core/tempo-map";
import { RESIDENT3_PATTERN } from "../data/patterns/resident-3";
import { PACE_FEEL, RHYTHM_FEEL } from "../data/rhythm-feel";
import { Pace } from "./pace";

const wordsOf = (upToBeat: number): number[] => {
  const beats: number[] = [];
  const { lengthBeats, events } = RESIDENT3_PATTERN;
  const cycles = Math.ceil(upToBeat / lengthBeats);
  for (let cycle = 0; cycle < cycles; cycle++) {
    for (const event of events) {
      if (event.type !== "word") continue;
      const beat = cycle * lengthBeats + event.beat;
      if (beat < upToBeat) beats.push(beat);
    }
  }
  return beats;
};

/** Bot ăn hoặc né mọi câu của pattern, rồi đọc độ dài một vòng. */
function fight(mode: "eat" | "dodge"): { heard: number; script: number; factor: number; paceAtEnd: number } {
  const bpm = RESIDENT3_PATTERN.bpm ?? RHYTHM_FEEL.defaultBpm;
  const tempo = new TempoMap(bpm);
  const pace = new Pace(tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
  const end = RESIDENT3_PATTERN.lengthBeats;
  for (const beat of wordsOf(end)) {
    if (mode === "eat") pace.absorb(beat);
    else pace.release(beat);
    pace.update(beat);
  }
  pace.update(end);
  return {
    heard: tempo.timeAtBeat(end),
    script: tempo.scriptTimeAtBeat(end),
    factor: pace.factor,
    paceAtEnd: tempo.paceAtBeat(end),
  };
}

describe("hệ số nhịp của cư dân 3", () => {
  it("bot ăn mọi chữ: một vòng không dài quá 1 / sàn lần kịch bản", () => {
    const { heard, script } = fight("eat");
    expect(wordsOf(RESIDENT3_PATTERN.lengthBeats).length).toBeGreaterThan(0);
    expect(heard / script).toBeGreaterThan(1);
    expect(heard / script).toBeLessThanOrEqual(1 / PACE_FEEL.floor);
  });

  it("bot ăn liên tục từ beat 0: vẫn không vượt 1 / 0,7, và sát trần nên sàn lỏng hơn sẽ vỡ", () => {
    const length = RESIDENT3_PATTERN.lengthBeats;
    const tempo = new TempoMap(RESIDENT3_PATTERN.bpm ?? 100);
    const pace = new Pace(tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
    for (let beat = 0; beat < length; beat++) {
      pace.absorb(beat);
      pace.update(beat + 1);
    }
    const ratio = tempo.timeAtBeat(length) / tempo.scriptTimeAtBeat(length);
    expect(PACE_FEEL.floor).toBe(0.7);
    expect(ratio).toBeLessThanOrEqual(1 / 0.7);
    expect(ratio).toBeGreaterThan(1.35);
    expect(pace.factor).toBeCloseTo(PACE_FEEL.floor, 9);
  });

  it("bot né mọi chữ: hệ số về đúng 1 và trận dài đúng bằng kịch bản", () => {
    const { heard, script, factor, paceAtEnd } = fight("dodge");
    expect(factor).toBe(1);
    expect(paceAtEnd).toBe(1);
    expect(heard).toBeCloseTo(script, 9);
  });

  it("hồi quá nhiều nấc thì kẹp ở 1, không bao giờ nhanh hơn kịch bản", () => {
    const tempo = new TempoMap(100);
    const pace = new Pace(tempo, PACE_FEEL, RHYTHM_FEEL.beatsPerBar);
    pace.absorb(0);
    pace.absorb(0.2);
    pace.update(1);
    expect(pace.factor).toBeCloseTo(0.8, 9);
    for (let i = 0; i < 5; i++) pace.release(1.2);
    pace.update(4);
    expect(pace.factor).toBe(1);
    expect(tempo.paceAtBeat(4)).toBe(1);
    expect(tempo.timeAtBeat(12)).toBeGreaterThanOrEqual(tempo.scriptTimeAtBeat(12) - 1e-9);
  });

  it("cùng một beat thì hạ trước rồi mới hồi, và giữa nhịp hệ số đứng yên", () => {
    const tempo = new TempoMap(100);
    const pace = new Pace(tempo, PACE_FEEL, 4);
    pace.absorb(0);
    pace.update(1);
    pace.absorb(1);
    pace.absorb(2);
    pace.update(3);
    expect(pace.factor).toBeCloseTo(0.7, 9);

    pace.release(5); // đầu nhịp kế là beat 8
    pace.absorb(7.2); // hạ cũng rơi vào beat 8
    pace.update(7.9);
    expect(pace.factor).toBeCloseTo(0.7, 9);
    pace.update(8);
    // Hạ trước: sàn giữ 0,7. Rồi hồi một nấc: 0,8. Hồi trước thì sẽ còn 0,7 (0,8 rồi hạ).
    expect(pace.factor).toBeCloseTo(0.8, 9);
    expect(tempo.paceAtBeat(8)).toBeCloseTo(0.8, 9);
  });
});
