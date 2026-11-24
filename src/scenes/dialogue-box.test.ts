import { describe, expect, it } from "vitest";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import type { DialogueLine } from "../data/dialogues";
import { DIALOGUE_FEEL, type DialogueFeel } from "../data/flow-feel";
import { FakeAudio } from "../testing/sim";
import { DialogueBox, pauseAfter, wrapText } from "./dialogue-box";

/** Mỗi ký tự 10 px. */
const measure = (text: string, _size?: number): number => text.length * 10;

const FEEL: DialogueFeel = { ...DIALOGUE_FEEL, charsPerSecond: 30, commaPause: 0.12, stopPause: 0.3, blipEvery: 2 };
const line = (text: string): DialogueLine => ({ speaker: "r1", text });

function setup(lines: DialogueLine[]) {
  const box = new DialogueBox(lines, measure, "box", FEEL);
  const input = new Input();
  const audio = new FakeAudio(5, 0);
  const tick = (keys: { confirm?: boolean; fast?: boolean } = {}): void => {
    input.setActionState("test", "confirm", keys.confirm ?? false);
    input.setActionState("test", "cancel", keys.fast ?? false);
    input.poll();
    box.update(input, audio);
  };
  /** Chạy `ticks` tick không bấm gì, hoặc giữ X. */
  const run = (ticks: number, fast = false): void => {
    for (let i = 0; i < ticks; i++) tick({ fast });
  };
  return { box, input, audio, tick, run };
}

describe("ngắt dòng", () => {
  it("không dòng nào vượt bề rộng, ngắt theo từ", () => {
    const text = "Một hai ba bốn năm sáu bảy tám chín mười mười một mười hai";
    for (const width of [60, 100, 150, 240]) {
      const lines = wrapText(text, width, 20, measure);
      for (const l of lines) expect(measure(l, 20), `width ${width}: "${l}"`).toBeLessThanOrEqual(width);
      expect(lines.join(" ")).toBe(text);
    }
  });

  it("một từ dài hơn cả dòng thì tự chiếm một dòng, không bị cắt", () => {
    const lines = wrapText("a bbbbbbbbbbbbbbbbbbbb c", 50, 20, measure);
    expect(lines).toEqual(["a", "bbbbbbbbbbbbbbbbbbbb", "c"]);
  });

  it("chuỗi rỗng không ra dòng nào", () => {
    expect(wrapText("   ", 100, 20, measure)).toEqual([]);
  });
});

describe("dừng sau dấu câu", () => {
  it("dấu phẩy dừng commaPause; dấu chấm giữa câu dừng stopPause; cuối câu và giữa chuỗi dấu thì không", () => {
    const text = "Ừ, được. Xong... rồi!";
    expect(pauseAfter(text, 1, FEEL)).toBe(FEEL.commaPause);
    expect(pauseAfter(text, 7, FEEL)).toBe(FEEL.stopPause);
    // "Xong..." : hai dấu chấm đầu không dừng, dấu cuối dừng một lần
    const dots = text.indexOf("...");
    expect(pauseAfter(text, dots, FEEL)).toBe(0);
    expect(pauseAfter(text, dots + 1, FEEL)).toBe(0);
    expect(pauseAfter(text, dots + 2, FEEL)).toBe(FEEL.stopPause);
    expect(pauseAfter(text, text.length - 1, FEEL)).toBe(0);
    expect(pauseAfter(text, 0, FEEL)).toBe(0);
  });

  it("chữ có dấu phẩy hiện chậm hơn chữ không có, đúng bằng thời gian dừng", () => {
    const withComma = setup([line("ab, cd efg")]);
    const without = setup([line("ab; cd efg")]);
    const ticksToFinish = (s: ReturnType<typeof setup>): number => {
      let ticks = 0;
      while (!s.box.lineComplete && ticks < 1000) {
        s.tick();
        ticks++;
      }
      return ticks;
    };
    const diff = (ticksToFinish(withComma) - ticksToFinish(without)) / TICK_RATE;
    expect(Math.abs(diff - FEEL.commaPause)).toBeLessThan(0.05);
  });
});

describe("điều khiển", () => {
  it("chữ chạy theo charsPerSecond", () => {
    const s = setup([line("x".repeat(60))]);
    s.run(TICK_RATE); // 1 giây
    expect(s.box.shownChars).toBeGreaterThanOrEqual(FEEL.charsPerSecond - 1);
    expect(s.box.shownChars).toBeLessThanOrEqual(FEEL.charsPerSecond + 1);
  });

  it("Z khi đang chạy hiện hết dòng, chưa sang dòng sau", () => {
    const s = setup([line("Một dòng khá dài để chữ còn đang chạy."), line("Dòng hai")]);
    s.run(5);
    expect(s.box.lineComplete).toBe(false);
    s.tick({ confirm: true });
    expect(s.box.lineComplete).toBe(true);
    expect(s.box.lineIndex).toBe(0);
  });

  it("Z khi đã hết sang dòng sau; Z ở dòng cuối thì done", () => {
    const s = setup([line("Một"), line("Hai")]);
    s.tick({ confirm: true });
    s.tick();
    expect(s.box.lineComplete).toBe(true);
    s.tick({ confirm: true });
    expect(s.box.lineIndex).toBe(1);
    expect(s.box.done).toBe(false);

    s.tick(); // nhả phím: lần bấm sau mới tính là một lần bấm mới
    s.tick({ confirm: true }); // hiện hết dòng hai
    s.tick();
    expect(s.box.done).toBe(false);
    s.tick({ confirm: true });
    expect(s.box.done).toBe(true);
  });

  it("giữ X thì chữ chạy nhanh gấp fastMultiplier", () => {
    const slow = setup([line("x".repeat(100))]);
    const fast = setup([line("x".repeat(100))]);
    slow.run(10);
    fast.run(10, true);
    expect(fast.box.shownChars / slow.box.shownChars).toBeGreaterThan(FEEL.fastMultiplier * 0.8);
    expect(fast.box.shownChars / slow.box.shownChars).toBeLessThan(FEEL.fastMultiplier * 1.25);
  });

  it("giữ X: hiện hết dòng rồi tự sang dòng sau sau fastHoldSeconds, nhưng không tự đóng dòng cuối", () => {
    const s = setup([line("Ngắn"), line("Hai")]);
    let ticks = 0;
    while (s.box.lineIndex === 0 && ticks < 600) {
      s.tick({ fast: true });
      ticks++;
    }
    expect(s.box.lineIndex).toBe(1);
    // Thời gian chờ ≥ fastHoldSeconds sau khi hiện hết.
    expect(ticks / TICK_RATE).toBeGreaterThanOrEqual(FEEL.fastHoldSeconds);
    for (let i = 0; i < 300; i++) s.tick({ fast: true });
    expect(s.box.done).toBe(false);
    s.tick({ confirm: true });
    expect(s.box.done).toBe(true);
  });

  it("không có dòng nào thì done ngay", () => {
    expect(new DialogueBox([], measure, "box", FEEL).done).toBe(true);
  });
});

describe("tiếng blip", () => {
  it("phát mỗi blipEvery ký tự, theo cao độ của người nói, không phát cho khoảng trắng", () => {
    const s = setup([{ speaker: "r4", text: "ab cd ef" }]);
    s.run(TICK_RATE * 2);
    expect(s.box.lineComplete).toBe(true);
    // 6 ký tự không phải khoảng trắng, mỗi 2 ký tự một tiếng.
    expect(s.audio.cues.filter((cue) => cue === "blip")).toHaveLength(3);
    expect(s.audio.cueHz.every((hz) => hz === 523)).toBe(true);
  });
});
