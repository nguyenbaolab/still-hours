import { describe, expect, it } from "vitest";
import { Input } from "../core/input";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { CHILD_DRAWING } from "../data/figures/child-drawing";
import type { PaperFigure } from "../data/paper";
import { RESIDENT4_PATTERN } from "../data/patterns/resident-4";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { PAPER_FEEL } from "../data/sketch-feel";
import { BulletWorld } from "./bullets";
import {
  handsFromFigure,
  nibPoint,
  paperPlace,
  paperPlaceAtTime,
  penOnStroke,
  validatePaper,
} from "./paper";
import { validatePattern, withPaperHands } from "./pattern-runner";
import { Player } from "./player";

const ARENA = BATTLE_LAYOUT.arena;
const WIDTH = ARENA.w;

describe("trống giấy", () => {
  it("vị trí giấy theo beat, chậm theo hệ số nhịp, và quay về đầu vòng", () => {
    const beats = 10;
    expect(paperPlace(0, beats, WIDTH)).toEqual({ pass: 1, scroll: 0 });
    expect(paperPlace(5, beats, WIDTH).scroll).toBeCloseTo(WIDTH / 2, 6);
    expect(paperPlace(5, beats, WIDTH).pass).toBe(1);
    const wrapped = paperPlace(15, beats, WIDTH);
    expect(wrapped.pass).toBe(2);
    expect(wrapped.scroll).toBeCloseTo(WIDTH / 2, 6);

    const tempo = new TempoMap(100);
    tempo.setPace(0, 0.5);
    const time = 3;
    const heard = paperPlaceAtTime(time, tempo, beats, WIDTH);
    const scriptBeat = tempo.scriptBeatAtTime(time);
    expect(tempo.beatAtTime(time)).toBeCloseTo(2.5, 6);
    expect(heard.scroll).toBeCloseTo(paperPlace(2.5, beats, WIDTH).scroll, 6);
    expect(heard.scroll).not.toBeCloseTo(paperPlace(scriptBeat, beats, WIDTH).scroll, 4);
  });

  it("bút nhấc khi điểm không nằm trên nét của vòng hiện tại", () => {
    const figure: PaperFigure = {
      name: "một nét",
      strokes: [{ pass: 1, points: [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }] }],
    };
    const on = penOnStroke(figure, 1, 0.5 * WIDTH, 0.5 * ARENA.h, 10, WIDTH, ARENA.h);
    const otherPass = penOnStroke(figure, 2, 0.5 * WIDTH, 0.5 * ARENA.h, 10, WIDTH, ARENA.h);
    const off = penOnStroke(figure, 1, 0.5 * WIDTH, 0.1 * ARENA.h, 10, WIDTH, ARENA.h);
    expect(on).toBe(true);
    expect(otherPass).toBe(false);
    expect(off).toBe(false);
  });

  it("horizontalRange = 0 thì không đi ngang", () => {
    const player = new Player(PLAYER_FEEL, 18);
    const home = ARENA.x + ARENA.w / 2;
    player.place(home, ARENA.y + 40);
    const input = new Input();
    input.setActionState("test", "left", true);
    input.setActionState("test", "down", true);
    input.poll();
    player.update(input, ARENA, { x: home, range: 0 });
    expect(player.x).toBeCloseTo(home, 6);
    expect(player.y).toBeGreaterThan(ARENA.y + 40);
  });

  it("cặp kim sinh đúng độ cao và tới cột giữa đúng beat", () => {
    const figure: PaperFigure = {
      name: "ngang",
      strokes: [{ pass: 1, points: [{ x: 0.25, y: 0.4 }, { x: 0.75, y: 0.4 }] }],
    };
    const hands = handsFromFigure(figure, ARENA, 10, 1000);
    const atQuarter = hands.find((hand) => Math.abs(hand.x - 0.25) < 1e-6);
    expect(atQuarter?.at).toBeCloseTo(0.4, 6);
    expect(atQuarter?.columnBeat).toBeCloseTo(2.5, 6);
    expect(atQuarter?.pass).toBe(1);
  });

  it("từ chối x không tăng, nét chồng khoảng, và khe quá xa; nhận tranh trẻ con", () => {
    const tempo = new TempoMap(100);
    const flat = (name: string, strokes: PaperFigure["strokes"]): string =>
      validatePaper({ name, strokes }, ARENA, tempo, 14, 36, 180).join("\n");

    expect(flat("lùi", [{ pass: 1, points: [{ x: 0.4, y: 0.5 }, { x: 0.2, y: 0.5 }] }])).toMatch(/x không tăng/);
    expect(
      flat("chồng", [
        { pass: 1, points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.2 }] },
        { pass: 1, points: [{ x: 0.4, y: 0.8 }, { x: 0.7, y: 0.8 }] },
      ]),
    ).toMatch(/chồng khoảng x/);
    expect(
      flat("xa", [
        { pass: 1, points: [{ x: 0.5, y: 0.1 }, { x: 0.52, y: 0.9 }] },
      ]),
    ).toMatch(/khe quá xa/);

    expect(validatePaper(CHILD_DRAWING, ARENA, tempo, PAPER_FEEL.beatsPerPass, PAPER_FEEL.handSpacing, PLAYER_FEEL.speed)).toEqual([]);
    expect(validatePattern(withPaperHands(RESIDENT4_PATTERN), BULLET_FEEL)).toEqual([]);
  });

  it("đứng đúng khe thì không trúng kim", () => {
    const world = new BulletWorld(ARENA, BULLET_FEEL);
    const home = ARENA.x + ARENA.w / 2;
    const gapY = ARENA.y + ARENA.h / 2;
    const paperX = 80;
    const beat = (paperX / WIDTH) * PAPER_FEEL.beatsPerPass;
    world.step(0, beat);
    world.spawnClamp(paperX, gapY, beat + 5, BULLET_FEEL.damage);
    world.step(0, beat);
    const box = { x: home - 5, y: gapY - 5, w: 10, h: 10 };
    expect(world.hit(box)).toBe(0);
    const nib = nibPoint(home, gapY, home, ARENA.y, paperX, WIDTH);
    expect(nib.x).toBeCloseTo(paperX, 6);
  });
});
