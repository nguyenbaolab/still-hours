import { describe, expect, it } from "vitest";
import { BulletWorld } from "../../battle/bullets";
import { DodgePhase } from "../../battle/dodge-phase";
import { pencilHome } from "../../battle/page";
import { validatePattern } from "../../battle/pattern-runner";
import { handlerFor, type SpawnContext } from "../../battle/spawners";
import { TICK_RATE } from "../../core/config";
import { Input } from "../../core/input";
import { TempoMap } from "../../core/tempo-map";
import { DrawerBot } from "../../testing/bots";
import { FakeAudio, simulate } from "../../testing/sim";
import { BATTLE_LAYOUT } from "../battle-layout";
import { BULLET_FEEL } from "../rhythm-feel";
import { DRAW_FEEL } from "../sketch-feel";
import type { BulletEvent } from "../pattern-types";
import { R4_IDLE_LINES, R4_ROUNDS } from "./resident-4";

const { arena } = BATTLE_LAYOUT;

describe("cư dân 4: ba lượt Nhặt bút", () => {
  it("có đúng ba lượt, đều hợp lệ, đều kiểu page có bút", () => {
    expect(R4_ROUNDS).toHaveLength(3);
    for (const round of R4_ROUNDS) {
      expect(validatePattern(round, BULLET_FEEL)).toEqual([]);
      expect(round.finish.kind).toBe("page");
      expect(round.loop).toBe(true);
      expect(round.pencil).toBeDefined();
      expect(round.idleLines).toBe(R4_IDLE_LINES);
    }
    expect(R4_IDLE_LINES).toHaveLength(3);
  });

  it("maxLoops × độ dài vòng ≤ 70 giây trên tempo kịch bản", () => {
    for (const round of R4_ROUNDS) {
      const tempo = new TempoMap(round.bpm);
      for (const event of round.events) if (event.type === "tempo") tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
      const seconds = tempo.scriptTimeAtBeat(DRAW_FEEL.maxLoops * round.lengthBeats);
      expect(seconds).toBeLessThanOrEqual(70);
    }
  });

  it("lượt 1: 8 beat đầu không có đạn trừ máu", () => {
    const harmful = R4_ROUNDS[0].events.filter((event) => event.type !== "distraction" && event.type !== "tempo" && event.beat < 8);
    expect(harmful).toEqual([]);
  });

  it("không có đạn hay xao nhãng nào xuất hiện trong bán kính 40 px quanh bút trong 4 beat đầu của vòng", () => {
    for (const round of R4_ROUNDS) {
      const pencil = pencilHome(arena, round.pencil);
      const world = new BulletWorld(arena, BULLET_FEEL);
      const ctx: SpawnContext = { arena, world, feel: BULLET_FEEL, playerX: pencil.x, playerY: pencil.y };
      world.step(0, 0);
      const early = round.events.filter((event): event is BulletEvent => event.type !== "tempo" && event.beat < 4);
      for (const event of early) handlerFor(event).spawn(ctx, event, null, 0, event.beat);
      for (let i = 0; i < world.dots.size; i++) {
        const dot = world.dots.at(i);
        expect(Math.hypot(dot.x - pencil.x, dot.y - pencil.y), `${round.name} đạn`).toBeGreaterThan(40);
      }
      for (let i = 0; i < world.distractions.size; i++) {
        const item = world.distractions.at(i);
        expect(Math.hypot(item.x - pencil.x, item.y - pencil.y), `${round.name} xao nhãng`).toBeGreaterThan(40);
      }
    }
  });

  it("bot đi tới bút và vẽ hoàn thành từng lượt trong ≤ 60 giây (máu được giữ đầy: chỉ đo thời gian trang khép)", () => {
    for (const round of R4_ROUNDS) {
      const audio = new FakeAudio(5, 0.03);
      const input = new Input();
      const phase = new DodgePhase(input, audio, 18, round);
      const player = phase["player"];
      const bot = new DrawerBot(input, arena);
      simulate({
        seconds: 60,
        audio,
        step: () => {
          player.hp = player.maxHp;
          bot.act(player, phase.pencilPosition, phase.holdingPencil);
          input.poll();
          phase.update();
        },
        stopWhen: () => phase.outcome !== "playing",
      });
      expect(phase.outcome, round.name).toBe("won");
      expect(audio.t - 5, round.name).toBeLessThanOrEqual(60);
      // Trang đủ beat vẽ thật, không phải khép nhờ hết vòng.
      expect(phase.page?.drawnBeats ?? 0, round.name).toBeGreaterThanOrEqual(round.finish.drawBeats - 1);
      expect(TICK_RATE).toBe(60);
    }
  });
});
