import { describe, expect, it } from "vitest";
import { TempoMap } from "../core/tempo-map";
import { DISASSEMBLY_FEEL, type DisassemblyFeel } from "../data/disassembly-feel";
import { CLOCKWORK } from "../data/mechanisms/clockwork";
import type { Mechanism, Part } from "../data/mechanisms/types";
import { Workbench, validateMechanism } from "./mechanism";

const FEEL: DisassemblyFeel = { ...DISASSEMBLY_FEEL, beatWindow: 0.2, unscrewSteps: 3, liftBeats: 4 };

function part(overrides: Partial<Part> & Pick<Part, "id" | "x" | "y">): Part {
  return {
    sprite: "screw",
    hit: { x: overrides.x - 0.05, y: overrides.y - 0.05, w: 0.1, h: 0.1 },
    blockedBy: [],
    operation: "unhook",
    ...overrides,
  };
}

function machine(parts: Part[], rhythmic = true): Mechanism {
  return { name: "thử", bpm: 100, rhythmic, parts };
}

describe("pha tháo lắp", () => {
  it("không tháo được khi còn bộ phận chặn, tháo chặn trước thì được", () => {
    const bench = new Workbench(
      machine([
        part({ id: "a", x: 0, y: 0, operation: "unhook" }),
        part({ id: "b", x: 1, y: 0, operation: "unhook", blockedBy: ["a"], core: true }),
      ]),
      FEEL,
    );
    const tempo = new TempoMap(100);
    bench.move("right");
    const blocked = bench.press(tempo, tempo.timeAtBeat(2));
    expect(blocked.flashed).toEqual(["a"]);
    expect(bench.removed.has("b")).toBe(false);

    bench.move("left");
    expect(bench.press(tempo, tempo.timeAtBeat(3)).removedId).toBe("a");
    bench.move("right");
    expect(bench.press(tempo, tempo.timeAtBeat(4)).removedId).toBe("b");
    expect(bench.finished).toBe(true);
  });

  it("lệch nhịp không tiến, đúng nhịp đúng một nấc, kể cả khi hệ số nhịp dưới 1", () => {
    const bench = new Workbench(
      machine([part({ id: "screw", x: 0, y: 0, operation: "unscrew", core: true })]),
      FEEL,
    );
    const tempo = new TempoMap(100);
    tempo.setPace(0, 0.5);
    const on = tempo.timeAtBeat(4.15);
    const off = tempo.timeAtBeat(4.5);

    const hit = bench.press(tempo, on);
    expect(hit.cue).toBe("unscrew");
    expect(bench.notchCount("screw")).toBe(1);

    const miss = bench.press(tempo, off);
    expect(miss.cue).toBe("clack");
    expect(bench.notchCount("screw")).toBe(1);
    expect(bench.removed.has("screw")).toBe(false);
  });

  it("giữ đủ số beat thì nhấc, nhả sớm thì không", () => {
    const bench = new Workbench(
      machine([part({ id: "lid", x: 0, y: 0, operation: "lift", core: true })]),
      FEEL,
    );
    const tempo = new TempoMap(100);
    expect(bench.hold(tempo, tempo.timeAtBeat(0), true).removedId).toBeNull();
    expect(bench.hold(tempo, tempo.timeAtBeat(0.4), true).removedId).toBeNull();
    expect(bench.hold(tempo, tempo.timeAtBeat(0.4), false).removedId).toBeNull();
    expect(bench.removed.has("lid")).toBe(false);

    expect(bench.hold(tempo, tempo.timeAtBeat(10), true).removedId).toBeNull();
    expect(bench.hold(tempo, tempo.timeAtBeat(14), true).removedId).toBe("lid");
  });

  it("rhythmic false thì lệch nhịp vẫn vặn được", () => {
    const bench = new Workbench(
      machine([part({ id: "screw", x: 0, y: 0, operation: "unscrew", core: true })], false),
      FEEL,
    );
    const tempo = new TempoMap(100);
    const off = tempo.timeAtBeat(4.5);
    expect(bench.press(tempo, off).cue).toBe("unscrew");
    expect(bench.notchCount("screw")).toBe(1);
  });

  it("con trỏ chọn bộ phận gần nhất theo hướng bấm", () => {
    const bench = new Workbench(
      machine([
        part({ id: "a", x: 0, y: 0 }),
        part({ id: "b", x: 1, y: 0 }),
        part({ id: "d", x: 3, y: 0 }),
        part({ id: "c", x: 0, y: 1 }),
        part({ id: "e", x: -1, y: 0, core: true }),
      ]),
      FEEL,
    );
    bench.move("right");
    expect(bench.selectedId).toBe("b");
    bench.move("up");
    expect(bench.selectedId).toBe("b");
    bench.move("left");
    expect(bench.selectedId).toBe("a");
    bench.move("down");
    expect(bench.selectedId).toBe("c");
    bench.move("left");
    bench.move("left");
    expect(bench.selectedId).toBe("e");
  });

  it("từ chối vòng lặp và máy thiếu core; nhận bộ máy thử", () => {
    const loop = validateMechanism(
      machine([
        part({ id: "a", x: 0, y: 0, blockedBy: ["b"] }),
        part({ id: "b", x: 1, y: 0, blockedBy: ["a"], core: true }),
      ]),
    ).join("\n");
    expect(loop).toMatch(/vòng lặp/);

    const noCore = validateMechanism(machine([part({ id: "a", x: 0, y: 0 })])).join("\n");
    expect(noCore).toMatch(/thiếu core/);

    expect(validateMechanism(CLOCKWORK)).toEqual([]);
  });
});
