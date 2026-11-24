import { describe, expect, it } from "vitest";
import { stageOf, validateMechanism } from "../battle/mechanism";
import { validatePattern } from "../battle/pattern-runner";
import { DIALOGUES } from "./dialogues";
import { ALARM_CLOCK } from "./mechanisms/alarm-clock";
import { RESIDENTS } from "./residents";
import { BULLET_FEEL } from "./rhythm-feel";

describe("nội dung: cư dân", () => {
  it("danh sách cư dân không trùng id", () => {
    const ids = RESIDENTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const resident of RESIDENTS) {
    describe(resident.id, () => {
      it("có 3 lượt hợp lệ", () => {
        expect(resident.rounds).toHaveLength(3);
        for (const round of resident.rounds) expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
      });

      it("máy hợp lệ, đúng 3 tầng, core ở tầng 3, mỗi tầng 3–4 bộ phận và có câu ký ức", () => {
        expect(validateMechanism(resident.mechanism)).toEqual([]);
        const stages = [1, 2, 3].map((n) => resident.mechanism.parts.filter((p) => stageOf(p) === n));
        expect(resident.mechanism.parts.every((p) => stageOf(p) >= 1 && stageOf(p) <= 3)).toBe(true);
        stages.forEach((parts, i) => {
          expect(parts.length, `tầng ${i + 1}`).toBeGreaterThanOrEqual(3);
          expect(parts.length, `tầng ${i + 1}`).toBeLessThanOrEqual(4);
          expect(parts.some((p) => p.memory), `tầng ${i + 1} có câu ký ức`).toBe(true);
        });
        const core = resident.mechanism.parts.find((p) => p.core);
        expect(core && stageOf(core)).toBe(3);
        expect(core?.memory).toBeDefined();
      });

      it("mọi câu ký ức ≤ 40 ký tự", () => {
        for (const part of resident.mechanism.parts) {
          if (part.memory) expect(part.memory.length, part.id).toBeLessThanOrEqual(40);
        }
      });

      it("mọi DialogueId tham chiếu đều có", () => {
        for (const id of Object.values(resident.dialogue)) expect(Object.keys(DIALOGUES)).toContain(id);
      });
    });
  }
});

describe("nội dung: đồng hồ báo thức của Linh", () => {
  it("đúng 4 câu ký ức, theo thiết kế: một câu tầng 1, một câu tầng 2, hai câu tầng 3 (một câu là core)", () => {
    expect(validateMechanism(ALARM_CLOCK)).toEqual([]);
    const memories = ALARM_CLOCK.parts.filter((p) => p.memory);
    expect(memories.map((p) => stageOf(p))).toEqual([1, 2, 3, 3]);
    expect(ALARM_CLOCK.parts.find((p) => p.core)?.memory).toBe("Hồi đó vẽ mà chẳng nghĩ gì.");
    expect(ALARM_CLOCK.rhythmic).toBe(true);
    expect(ALARM_CLOCK.bpm).toBe(100);
  });
});
