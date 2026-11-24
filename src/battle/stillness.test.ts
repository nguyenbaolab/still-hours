import { describe, expect, it } from "vitest";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import { TempoMap } from "../core/tempo-map";
import { STILL_FEEL } from "../data/flow-feel";
import type { Pattern } from "../data/pattern-types";
import { R2_ROUNDS } from "../data/patterns/resident-2";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { FakeAudio, simulate } from "../testing/sim";
import { DodgePhase } from "./dodge-phase";
import { validatePattern } from "./pattern-runner";
import { isStill, Stillness } from "./stillness";

const DT = 1 / TICK_RATE;

describe("Stillness: khi nào hạ và hồi hệ số nhịp", () => {
  it("đứng yên chưa đủ stillSeconds thì không đổi hệ số", () => {
    const tempo = new TempoMap(100);
    const still = new Stillness(tempo, STILL_FEEL);
    for (let t = 0; t < STILL_FEEL.stillSeconds - 0.05; t += DT) still.update(t, t / 0.6, true, DT);
    expect(still.active).toBe(false);
    expect(tempo.paceAtBeat(100)).toBe(1);
    expect(tempo.version).toBe(0);
  });

  it("đủ thì setPace(pace) từ beat NGUYÊN kế tiếp, không phải từ beat hiện tại", () => {
    const tempo = new TempoMap(100);
    const still = new Stillness(tempo, STILL_FEEL);
    still.update(0, 2.0, true, DT);
    still.update(STILL_FEEL.stillSeconds, 3.4, true, DT);
    expect(still.active).toBe(true);
    expect(tempo.paceAtBeat(3.4)).toBe(1);
    expect(tempo.paceAtBeat(3.99)).toBe(1);
    expect(tempo.paceAtBeat(4)).toBe(STILL_FEEL.pace);
  });

  it("di chuyển lại thì hồi về 1 từ beat nguyên kế tiếp", () => {
    const tempo = new TempoMap(100);
    const still = new Stillness(tempo, STILL_FEEL);
    still.update(0, 2.0, true, DT);
    still.update(STILL_FEEL.stillSeconds, 3.4, true, DT);
    still.update(STILL_FEEL.stillSeconds + 0.5, 5.2, false, DT);
    expect(still.active).toBe(false);
    expect(tempo.paceAtBeat(5.99)).toBe(STILL_FEEL.pace);
    expect(tempo.paceAtBeat(6)).toBe(1);
  });

  it("một tick di chuyển giữa chừng đặt lại đồng hồ đứng yên", () => {
    const tempo = new TempoMap(100);
    const still = new Stillness(tempo, STILL_FEEL);
    still.update(0, 0, true, DT);
    still.update(0.8, 1.3, true, DT);
    still.update(0.85, 1.4, false, DT);
    still.update(1.2, 2, true, DT);
    expect(still.active).toBe(false);
    still.update(0.85 + STILL_FEEL.stillSeconds + 0.1, 3, true, DT);
    expect(still.active).toBe(false);
    still.update(1.2 + STILL_FEEL.stillSeconds + 0.01, 4, true, DT);
    expect(still.active).toBe(true);
  });

  it("cảnh nền hiện dần trong fadeInSeconds sau khi đứng yên đủ, tắt trong fadeOutSeconds khi di chuyển", () => {
    const tempo = new TempoMap(100);
    const still = new Stillness(tempo, STILL_FEEL);
    let t = 0;
    for (; t < STILL_FEEL.stillSeconds; t += DT) still.update(t, t / 0.6, true, DT);
    expect(still.backdrop).toBe(0);
    for (let k = 0; k < Math.round(STILL_FEEL.fadeInSeconds / DT) / 2; k++, t += DT) still.update(t, t / 0.6, true, DT);
    expect(still.backdrop).toBeGreaterThan(0.4);
    expect(still.backdrop).toBeLessThan(0.6);
    for (let k = 0; k < Math.round(STILL_FEEL.fadeInSeconds / DT) + 2; k++, t += DT) still.update(t, t / 0.6, true, DT);
    expect(still.backdrop).toBe(1);
    for (let k = 0; k < Math.ceil(STILL_FEEL.fadeOutSeconds / DT) + 1; k++, t += DT) still.update(t, t / 0.6, false, DT);
    expect(still.backdrop).toBe(0);
  });
});

describe("isStill: đứng yên là gì", () => {
  it("không input và dịch không quá 0,5 px", () => {
    expect(isStill(false, 0, STILL_FEEL)).toBe(true);
    expect(isStill(false, 0.5, STILL_FEEL)).toBe(true);
  });

  it("bị lực hút kéo hơn 0,5 px trong tick thì không tính", () => {
    expect(isStill(false, 0.51, STILL_FEEL)).toBe(false);
  });

  it("có input di chuyển thì không tính, kể cả khi bị tường chặn (không dịch được)", () => {
    expect(isStill(true, 0, STILL_FEEL)).toBe(false);
  });
});

describe("validatePattern: still", () => {
  const base: Pattern = { name: "thử", bpm: 100, lengthBeats: 20, loop: false, finish: { kind: "length" }, events: [] };

  it("ba lượt của cư dân 2 hợp lệ, mỗi lượt một cảnh nền", () => {
    for (const round of R2_ROUNDS) expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
    expect(R2_ROUNDS.map((r) => r.still?.backdrop)).toEqual(["dusk", "clouds", "birds"]);
  });

  it("từ chối still đi cùng đạn word (hai nguồn cùng gọi setPace)", () => {
    const bad: Pattern = {
      ...base,
      still: { backdrop: "dusk" },
      events: [{ beat: 4, type: "word", from: "right", at: 0.5, phrase: 0 }],
    };
    expect(validatePattern(bad, BULLET_FEEL).join("\n")).toContain("still không đi cùng đạn word");
  });

  it("từ chối cảnh nền không có", () => {
    expect(validatePattern({ ...base, still: { backdrop: "không-có" } }, BULLET_FEEL).join("\n")).toContain("không có cảnh nền");
  });

  it("không có still thì word vẫn được", () => {
    const ok: Pattern = { ...base, events: [{ beat: 4, type: "word", from: "right", at: 0.5, phrase: 0 }] };
    expect(validatePattern(ok, BULLET_FEEL)).toEqual([]);
  });
});

describe("DodgePhase: đứng yên chậm nhịp", () => {
  const LENGTH = 40;
  const quiet: Pattern = {
    name: "yên",
    bpm: 100,
    lengthBeats: LENGTH,
    loop: false,
    finish: { kind: "length" },
    still: { backdrop: "dusk" },
    events: [],
  };

  /** Chạy tới khi thắng; trả về tỉ lệ giờ nghe được trên giờ kịch bản. `walk` quyết định bot có đi lại không. */
  function ratio(walk: boolean): number {
    const audio = new FakeAudio(5, 0.03);
    const input = new Input();
    const phase = new DodgePhase(input, audio, 18, quiet);
    let tick = 0;
    simulate({
      seconds: 120,
      audio,
      step: () => {
        const left = Math.floor(tick / 20) % 2 === 0;
        input.setActionState("bot", "left", walk && left);
        input.setActionState("bot", "right", walk && !left);
        input.poll();
        phase.update();
        tick++;
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    const clock = phase["clock"];
    return clock.time / clock.tempo.scriptTimeAtBeat(LENGTH);
  }

  it("bot đứng yên mãi: lượt dài hơn kịch bản nhưng không quá 1 / 0,75 ≈ 1,34 lần", () => {
    const r = ratio(false);
    expect(r).toBeGreaterThan(1.25);
    expect(r).toBeLessThanOrEqual(1.34);
  });

  it("bot đi lại liên tục: nhịp đúng kịch bản", () => {
    const r = ratio(true);
    expect(r).toBeGreaterThan(0.98);
    expect(r).toBeLessThan(1.03);
  });
});