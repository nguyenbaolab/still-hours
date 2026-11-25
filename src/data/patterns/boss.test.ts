import { describe, expect, it } from "vitest";
import { stageOf, validateMechanism } from "../../battle/mechanism";
import { validatePattern } from "../../battle/pattern-runner";
import { DodgePhase } from "../../battle/dodge-phase";
import { Input } from "../../core/input";
import { release, steer } from "../../testing/bots";
import { FakeAudio, simulate } from "../../testing/sim";
import { BATTLE_LAYOUT } from "../battle-layout";
import { TOWER_CLOCK } from "../mechanisms/tower-clock";
import type { ExitFinish, Pattern } from "../pattern-types";
import { BULLET_FEEL } from "../rhythm-feel";
import { BOSS_ROUNDS } from "./boss";

const { arena } = BATTLE_LAYOUT;
const exitOf = (round: Pattern): ExitFinish => {
  if (round.finish?.kind !== "exit") throw new Error("không phải exit");
  return round.finish;
};

describe("boss: ba lượt vòng lặp", () => {
  it("ba lượt hợp lệ, loop true, vòng 32 beat, khe ở cạnh phải / trên / trái", () => {
    expect(BOSS_ROUNDS).toHaveLength(3);
    for (const round of BOSS_ROUNDS) {
      expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
      expect(round.loop).toBe(true);
      expect(round.lengthBeats).toBe(32);
      expect(round.pencil).toBeUndefined();
    }
    expect(BOSS_ROUNDS.map((r) => exitOf(r).side)).toEqual(["right", "top", "left"]);
    expect(BOSS_ROUNDS.map((r) => exitOf(r).openBeat)).toEqual([24, 20, 28]);
    for (const round of BOSS_ROUNDS) {
      expect(exitOf(round).widths).toEqual([28, 44, 64]);
      expect(exitOf(round).openBeats).toEqual([2, 4, 999]);
    }
  });

  it("lượt 1 tích tắc dồn (tăng tới 140 BPM); lượt 2 có `still` + xao nhãng, không có chữ; lượt 3 có chữ + đồng hồ trễ", () => {
    const [r1, r2, r3] = BOSS_ROUNDS;
    const tempo = r1.events.find((e) => e.type === "tempo");
    expect(r1.bpm).toBe(116);
    expect(tempo && tempo.type === "tempo" && tempo.bpm).toBe(140);
    expect(r2.still).toEqual({ backdrop: "tower" });
    expect(r2.events.some((e) => e.type === "distraction")).toBe(true);
    expect(r2.events.some((e) => e.type === "word")).toBe(false);
    expect(r3.lagClock).toBe(true);
    expect(r3.events.some((e) => e.type === "word")).toBe(true);
    expect(r3.events.some((e) => e.type === "straight" || e.type === "aimed")).toBe(true);
  });

  it("không có đạn nào bắn từ cạnh có khe cửa (lối ra không bị đạn chặn thẳng cửa)", () => {
    for (const round of BOSS_ROUNDS) {
      const side = exitOf(round).side;
      for (const e of round.events) {
        if ("from" in e) expect(e.from, `${round.name} beat ${e.beat}`).not.toBe(side);
      }
    }
  });

  it("bot canh khe (máu giữ đầy): ra được ở mọi lượt, chậm nhất khi khe mở hẳn từ vòng 4", () => {
    for (const round of BOSS_ROUNDS) {
      const finish = exitOf(round);
      const audio = new FakeAudio(5, 0.03);
      const input = new Input();
      const phase = new DodgePhase(input, audio, 18, round);
      const player = phase["player"];
      simulate({
        seconds: 5 + 90,
        audio,
        step: () => {
          player.hp = player.maxHp;
          const exit = phase["exit"];
          if (!exit) {
            release(input);
            input.poll();
            phase.update();
            return;
          }
          const door = exit.nextDoor;
          const along = (door.from + door.to) / 2;
          const out = 40;
          const edge = 9;
          const target =
            finish.side === "right"
              ? { x: exit.open ? arena.x + arena.w + out : arena.x + arena.w - edge, y: along }
              : finish.side === "left"
                ? { x: exit.open ? arena.x - out : arena.x + edge, y: along }
                : { x: along, y: exit.open ? arena.y - out : arena.y + edge };
          steer(input, target.x - player.x, target.y - player.y);
          input.poll();
          phase.update();
        },
        stopWhen: () => phase.outcome !== "playing",
      });
      expect(phase.outcome, round.name).toBe("won");
      expect(phase.loopsSeen, round.name).toBeLessThanOrEqual(3);
    }
  });

  it("bánh răng đứng yên giữa khung không ra được dù đã qua 3 vòng (phải chủ động bước ra)", () => {
    const audio = new FakeAudio(5, 0.03);
    const input = new Input();
    const phase = new DodgePhase(input, audio, 18, BOSS_ROUNDS[0], { loopsSeen: 3 });
    const player = phase["player"];
    simulate({
      seconds: 5 + 10,
      audio,
      step: () => {
        player.hp = player.maxHp;
        input.poll();
        phase.update();
      },
    });
    expect(phase.outcome).toBe("playing");
  });
});

describe("boss: máy tháp đồng hồ", () => {
  it("hợp lệ, 72 BPM theo nhịp, core là bộ thoát ở tầng 3, 4 câu ký ức (1, 1, 2 theo tầng)", () => {
    expect(validateMechanism(TOWER_CLOCK)).toEqual([]);
    expect(TOWER_CLOCK.bpm).toBe(72);
    expect(TOWER_CLOCK.rhythmic).toBe(true);
    const core = TOWER_CLOCK.parts.find((p) => p.core);
    expect(core?.id).toBe("escapement");
    expect(core?.memory).toBe("Còn kịp không?");
    const memories = TOWER_CLOCK.parts.filter((p) => p.memory);
    expect(memories.map((p) => p.memory)).toEqual([
      "Tiệm chưa bao giờ đóng cửa sớm.",
      "Lá thư viết xong, chưa gửi.",
      "Sang năm. Sang năm nữa.",
      "Còn kịp không?",
    ]);
    expect(memories.map((p) => stageOf(p))).toEqual([1, 2, 3, 3]);
  });
});