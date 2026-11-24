import { describe, expect, it } from "vitest";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { DISTRACTION_FEEL } from "../data/sketch-feel";
import { BulletWorld } from "./bullets";
import { validatePattern } from "./pattern-runner";
import { distractionNeedsTelegraph } from "./spawners";

describe("đạn xao nhãng", () => {
  it("chạm không trừ máu, và mỗi viên chỉ tính một lần", () => {
    const arena = BATTLE_LAYOUT.arena;
    const world = new BulletWorld(arena, BULLET_FEEL);
    const x = arena.x + arena.w / 2;
    const y = arena.y + arena.h / 2;
    const heart = { x: x - 4, y: y - 4, w: 8, h: 8 };
    world.step(0, 0);
    world.spawnDistraction(x, y, 0, 0, DISTRACTION_FEEL.radius, DISTRACTION_FEEL.sprite, 0);

    expect(world.hit(heart)).toBe(0);
    expect(world.consumeDistractions(heart)).toBe(1);
    expect(world.consumeDistractions(heart)).toBe(0);
    expect(world.hit(heart)).toBe(0);
  });

  it("không cầm bút (active = false) thì đạn bay xuyên qua: không bị lấy ra, vẫn không trừ máu", () => {
    const arena = BATTLE_LAYOUT.arena;
    const world = new BulletWorld(arena, BULLET_FEEL);
    const x = arena.x + arena.w / 2;
    const y = arena.y + arena.h / 2;
    const heart = { x: x - 4, y: y - 4, w: 8, h: 8 };
    world.step(0, 0);
    world.spawnDistraction(x, y, 0, 0, DISTRACTION_FEEL.radius, DISTRACTION_FEEL.sprite, 0);

    expect(world.consumeDistractions(heart, false)).toBe(0);
    expect(world.distractions.size).toBe(1);
    expect(world.hit(heart)).toBe(0);
    expect(world.consumeDistractions(heart, true)).toBe(1);
    expect(world.grabX).toBeCloseTo(x, 6);
    expect(world.grabY).toBeCloseTo(y, 6);
  });

  it("lớn hoặc có lực hút thì bắt buộc cảnh báo; nhỏ và không hút thì không", () => {
    expect(distractionNeedsTelegraph(5, 8, 0)).toBe(false);
    expect(distractionNeedsTelegraph(5, 8, 24)).toBe(true);
    expect(distractionNeedsTelegraph(8, 8, 0)).toBe(true);
  });

  it("validatePattern từ chối distraction thiếu cảnh báo khi luật đòi cảnh báo", () => {
    const problems = validatePattern(
      {
        name: "hút",
        lengthBeats: 8,
        loop: false,
        events: [{ beat: 2, type: "distraction", from: "left", at: 0.5, telegraphBeats: 0 }],
      },
      BULLET_FEEL,
    ).join("\n");
    const required = distractionNeedsTelegraph(DISTRACTION_FEEL.radius, BULLET_FEEL.bigRadius, DISTRACTION_FEEL.pull);
    if (required) expect(problems).toMatch(/distraction.*bắt buộc có cảnh báo/);
    else expect(problems).toBe("");
  });
});
