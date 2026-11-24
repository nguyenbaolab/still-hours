import { describe, expect, it } from "vitest";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import { DIALOGUES } from "../data/dialogues";
import { INTRO_FEEL } from "../data/flow-feel";
import { FakeAudio } from "../testing/sim";
import { IntroScene } from "./intro";

const measure = (text: string, size: number): number => text.length * (size / 2);

function rig() {
  const input = new Input();
  const audio = new FakeAudio(5, 0.03);
  const scene = new IntroScene(DIALOGUES.introOpening, input, audio, measure);
  const tick = (confirm = false): void => {
    input.setActionState("test", "confirm", confirm);
    input.poll();
    scene.update();
    audio.t += 1 / TICK_RATE;
  };
  return { audio, scene, tick };
}

const LEAD_TICKS = Math.round(INTRO_FEEL.leadSeconds * TICK_RATE);
const SILENCE_TICKS = Math.round(INTRO_FEEL.silenceSeconds * TICK_RATE);

/** Đọc tới khi dòng hiện tại là `line` (bấm Z cách quãng). */
function readUntilLine(r: ReturnType<typeof rig>, line: number): void {
  for (let i = 0; i < 4000 && r.scene.lineIndex < line; i++) r.tick(i % 20 === 0);
}

describe("IntroScene", () => {
  it("tích tắc chạy trước, chữ chưa hiện trong lúc dạo đầu", () => {
    const r = rig();
    for (let i = 0; i < LEAD_TICKS - 1; i++) r.tick();
    expect(r.scene.waiting).toBe(true);
    expect(r.scene.ticking).toBe(true);
    expect(r.audio.plays.length).toBeGreaterThan(0);
    // Phím trong lúc dạo đầu không làm gì.
    r.tick(true);
    expect(r.scene.lineIndex).toBe(0);
  });

  it("tích tắc dừng hẳn khi sang dòng 2: không còn tiếng nào chưa phát, và không hẹn thêm", () => {
    const r = rig();
    for (let i = 0; i < LEAD_TICKS + 5; i++) r.tick();
    expect(r.scene.ticking).toBe(true);

    readUntilLine(r, INTRO_FEEL.stopAtLine);
    expect(r.scene.lineIndex).toBe(INTRO_FEEL.stopAtLine);
    expect(r.scene.ticking).toBe(false);
    expect(r.audio.plays.filter((p) => !p.cancelled && p.time > r.audio.t)).toEqual([]);

    const count = r.audio.plays.length;
    for (let i = 0; i < 5 * TICK_RATE; i++) r.tick();
    expect(r.audio.plays.length).toBe(count);
  });

  it("im lặng một lúc rồi chữ của dòng 2 mới hiện", () => {
    const r = rig();
    for (let i = 0; i < LEAD_TICKS + 5; i++) r.tick();
    readUntilLine(r, INTRO_FEEL.stopAtLine);
    expect(r.scene.waiting).toBe(true);
    for (let i = 0; i < SILENCE_TICKS - 2; i++) r.tick();
    expect(r.scene.waiting).toBe(true);
    for (let i = 0; i < 6; i++) r.tick();
    expect(r.scene.waiting).toBe(false);
  });

  it("đọc hết lời dẫn thì xong", () => {
    const r = rig();
    for (let i = 0; i < 20000 && !r.scene.finished; i++) r.tick(i % 20 === 0);
    expect(r.scene.finished).toBe(true);
  });
});
