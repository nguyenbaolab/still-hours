import { describe, expect, it } from "vitest";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { BULLET_FEEL, WORD_FEEL, wordBox } from "../data/rhythm-feel";
import { BulletWorld } from "./bullets";

describe("đạn chữ", () => {
  const arena = BATTLE_LAYOUT.arena;
  const centerX = arena.x + arena.w / 2;
  const centerY = arena.y + arena.h / 2;

  it("hitbox nhỏ hơn khung chữ, và trúng không trừ máu", () => {
    const world = new BulletWorld(arena, BULLET_FEEL);
    const box = wordBox("vô dụng");
    expect(box.hitW).toBeLessThan(box.w);
    expect(box.hitH).toBeLessThan(box.h);
    expect(box.hitW / box.w).toBeCloseTo(WORD_FEEL.hitboxScale, 9);

    world.step(0, 0);
    world.spawnWord(centerX, centerY, 0, 0, "vô dụng", box, 0);

    const outer = {
      x: centerX - box.w / 2,
      y: centerY - box.h / 2,
      w: (box.w - box.hitW) / 2 - 0.5,
      h: box.h,
    };
    expect(world.absorbWords(outer)).toBe(0);

    const heart = { x: centerX - 2, y: centerY - 2, w: 4, h: 4 };
    expect(world.hit(heart)).toBe(0);
    expect(world.absorbWords(heart)).toBe(1);
    expect(world.absorbWords(heart)).toBe(0);
    expect(world.hit(heart)).toBe(0);
  });

  it("đi hết khung thì nhả một lần; vừa chạm vừa ra mép thì tính là ôm", () => {
    const world = new BulletWorld(arena, BULLET_FEEL);
    const box = wordBox("chậm quá");
    const originX = arena.x + arena.w + 30;
    world.step(0, 0);
    world.spawnWord(originX, centerY, Math.PI, 100, "chậm quá", box, 0);

    const travel = originX - arena.x;
    world.step(travel / 100 - 0.05, 1);
    world.commitWords();
    expect(world.signals).toEqual([]);

    world.step(travel / 100 + 0.05, 2);
    world.commitWords();
    expect(world.signals).toEqual(["release"]);
    world.commitWords();
    expect(world.signals).toEqual([]);

    const hugging = new BulletWorld(arena, BULLET_FEEL);
    hugging.step(0, 0);
    hugging.spawnWord(arena.x + 10, centerY, Math.PI, 100, "vô dụng", wordBox("vô dụng"), 0);
    hugging.step(0.2, 1);
    const word = hugging.words.at(0);
    expect(hugging.absorbWords({ x: word.x - 4, y: word.y - 4, w: 8, h: 8 })).toBe(1);
    hugging.commitWords();
    expect(hugging.signals).toEqual([]);
  });
});
