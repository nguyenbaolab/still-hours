import { describe, expect, it } from "vitest";
import { stageOf, validateMechanism } from "../../battle/mechanism";
import { STOPWATCH } from "../mechanisms/stopwatch";
import { R2_ROUNDS } from "./resident-2";

describe("cư dân 2: đứng yên thì thế giới hiện ra", () => {
  it("ba lượt 100 BPM, 52 / 56 / 60 beat, kết theo độ dài, hai beat cuối trở đi để trống", () => {
    expect(R2_ROUNDS.map((r) => r.lengthBeats)).toEqual([52, 56, 60]);
    for (const round of R2_ROUNDS) {
      expect(round.bpm).toBe(100);
      expect(round.finish).toEqual({ kind: "length" });
      expect(round.loop).toBe(false);
      for (const event of round.events) expect(event.beat).toBeLessThanOrEqual(round.lengthBeats - 3);
    }
  });

  it("straight chỉ đi ở làn ngoài túi an toàn giữa khung (0,3..0,7): đứng giữa khung thì không bị trúng", () => {
    for (const round of R2_ROUNDS) {
      const straight = round.events.filter((e) => e.type === "straight");
      expect(straight.length).toBeGreaterThan(10);
      for (const e of straight) if (e.type === "straight") expect(e.at < 0.3 || e.at > 0.7).toBe(true);
    }
  });

  it("aimed mỗi 8 beat: đứng yên mãi không được", () => {
    for (const round of R2_ROUNDS) {
      const aimed = round.events.filter((e) => e.type === "aimed").map((e) => e.beat);
      expect(aimed.length).toBeGreaterThanOrEqual(5);
      aimed.forEach((beat, i) => expect(beat).toBe(8 * (i + 1)));
    }
  });

  it("không đạn word (still không đi cùng word)", () => {
    for (const round of R2_ROUNDS) expect(round.events.some((e) => e.type === "word")).toBe(false);
  });
});

describe("cư dân 2: đồng hồ bấm giờ", () => {
  it("hợp lệ, theo nhịp 96 BPM, có unscrew", () => {
    expect(validateMechanism(STOPWATCH)).toEqual([]);
    expect(STOPWATCH.rhythmic).toBe(true);
    expect(STOPWATCH.bpm).toBe(96);
    expect(STOPWATCH.parts.some((p) => p.operation === "unscrew")).toBe(true);
  });

  it("bốn câu ký ức theo thiết kế (một / một / hai, core cuối)", () => {
    const memories = STOPWATCH.parts.filter((p) => p.memory);
    expect(memories.map((p) => stageOf(p))).toEqual([1, 2, 3, 3]);
    expect(memories.map((p) => p.memory)).toEqual([
      "Con diều mắc trên dây điện.",
      "Mùa hoa sữa, năm nào cũng vội.",
      "Con mèo chờ ở bậc cửa.",
      "Bầu trời hôm ấy rất xanh.",
    ]);
    expect(STOPWATCH.parts.find((p) => p.core)?.memory).toBe("Bầu trời hôm ấy rất xanh.");
  });
});