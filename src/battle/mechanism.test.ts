import { describe, expect, it } from "vitest";
import { TempoMap } from "../core/tempo-map";
import { DISASSEMBLY_FEEL, type DisassemblyFeel } from "../data/disassembly-feel";
import { CLOCKWORK } from "../data/mechanisms/clockwork";
import type { Mechanism, Part } from "../data/mechanisms/types";
import { Input } from "../core/input";
import { FakeAudio } from "../testing/sim";
import { DisassemblePhase } from "./disassemble-phase";
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

describe("tầng của pha tháo lắp", () => {
  const joined = (mechanism: Mechanism): string => validateMechanism(mechanism).join(" | ");

  it("blockedBy trỏ tới bộ phận ở tầng sau → lỗi", () => {
    const bad = machine([
      part({ id: "a", x: 0, y: 0, stage: 1, blockedBy: ["b"] }),
      part({ id: "b", x: 1, y: 0, stage: 2, core: true }),
    ]);
    expect(joined(bad)).toMatch(/bị chặn bởi "b" ở tầng sau/);
  });

  it("thiếu tầng ở giữa → lỗi", () => {
    const bad = machine([part({ id: "a", x: 0, y: 0, stage: 1 }), part({ id: "b", x: 1, y: 0, stage: 3, core: true })]);
    expect(joined(bad)).toMatch(/thiếu tầng 2/);
  });

  it("core không ở tầng cuối → lỗi", () => {
    const bad = machine([part({ id: "a", x: 0, y: 0, stage: 1, core: true }), part({ id: "b", x: 1, y: 0, stage: 2 })]);
    expect(joined(bad)).toMatch(/core "a" ở tầng 1, phải ở tầng cuối \(2\)/);
  });

  it("tầng không phải số nguyên ≥ 1 → lỗi; máy không khai tầng là một tầng, vẫn hợp lệ", () => {
    expect(joined(machine([part({ id: "a", x: 0, y: 0, stage: 0, core: true })]))).toMatch(/tầng 0 không hợp lệ/);
    expect(joined(machine([part({ id: "a", x: 0, y: 0, core: true })]))).toBe("");
  });

  it("CLOCKWORK có đúng 3 tầng", () => {
    expect(new Set(CLOCKWORK.parts.map((p) => p.stage ?? 1))).toEqual(new Set([1, 2, 3]));
  });

  it("con trỏ không chọn được bộ phận tầng sau, và về bộ phận gần góc trên trái khi mở tầng", () => {
    const bench = new Workbench(
      machine([
        part({ id: "far", x: 0.9, y: 0.9, stage: 1 }),
        part({ id: "near", x: 0.1, y: 0.1, stage: 1 }),
        part({ id: "later", x: 0.5, y: 0.5, stage: 2, core: true }),
      ]),
      FEEL,
    );
    expect(bench.selectedId).toBe("near");
    bench.move("right");
    expect(bench.selectedId).toBe("far");
    bench.move("up");
    bench.move("left");
    expect(bench.selectedId).not.toBe("later");
    for (const dir of ["up", "down", "left", "right"] as const) {
      bench.move(dir);
      expect(bench.selectedId).not.toBe("later");
    }
  });

  it("stageComplete chỉ đúng khi tầng xong và câu ký ức đã đóng", () => {
    const bench = new Workbench(
      machine(
        [
          part({ id: "a", x: 0, y: 0, stage: 1, memory: "một" }),
          part({ id: "b", x: 1, y: 0, stage: 2, core: true, memory: "hai" }),
        ],
        false,
      ),
      FEEL,
    );
    const tempo = new TempoMap(100);
    expect(bench.stageComplete).toBe(false);
    expect(bench.press(tempo, 0).removedId).toBe("a");
    expect(bench.memory).toBe("một");
    expect(bench.stageComplete).toBe(false);
    bench.closeMemory();
    expect(bench.stageComplete).toBe(true);

    bench.setStage(2);
    expect(bench.stageComplete).toBe(false);
    expect(bench.selectedId).toBe("b");
    expect(bench.press(tempo, 0).removedId).toBe("b");
    expect(bench.stageComplete).toBe(false);
    bench.closeMemory();
    expect(bench.stageComplete).toBe(true);
  });

  it("tháo hết 3 tầng CLOCKWORK: tầng 3 xong đúng lúc đóng câu của core, removed giữ qua các tầng", () => {
    const rhythmless: Mechanism = { ...CLOCKWORK, rhythmic: false };
    const bench = new Workbench(rhythmless, { ...FEEL, unscrewSteps: 1, liftBeats: 1 });
    const tempo = new TempoMap(100);
    let beat = 0;
    const nextBeat = (): number => tempo.timeAtBeat((beat += 2));

    const takeAll = (stage: number): void => {
      bench.setStage(stage);
      for (let guard = 0; guard < 60 && !bench.stageComplete; guard++) {
        if (bench.memory) {
          bench.closeMemory();
          continue;
        }
        // Thử từng bộ phận chọn được theo thứ tự id; lệnh nào tháo được thì tháo.
        let progressed = false;
        for (const p of rhythmless.parts) {
          if ((p.stage ?? 1) > stage || bench.removed.has(p.id)) continue;
          bench.selectedId = p.id;
          const blocked = p.blockedBy.some((id) => !bench.removed.has(id));
          if (blocked) continue;
          const time = nextBeat();
          const result = p.operation === "lift" ? (bench.hold(tempo, time, true), bench.hold(tempo, tempo.timeAtBeat(beat + 1), true)) : bench.press(tempo, time);
          if (result.removedId) {
            progressed = true;
            break;
          }
        }
        if (!progressed) break;
      }
    };

    takeAll(1);
    expect(bench.stageComplete).toBe(true);
    expect(bench.removed.size).toBe(4);
    takeAll(2);
    expect(bench.stageComplete).toBe(true);
    expect(bench.removed.size).toBe(6);

    bench.setStage(3);
    expect(bench.stageComplete).toBe(false);
    takeAll(3);
    expect(bench.stageComplete).toBe(true);
    expect(bench.removed.size).toBe(CLOCKWORK.parts.length);
    expect(bench.finished).toBe(true);
  });
});

describe("DisassemblePhase: outcome theo tầng", () => {
  it("tầng xong sau khi đóng câu ký ức cuối: outcome done; trước đó là playing", () => {
    const machineTwo = machine(
      [
        part({ id: "a", x: 0.2, y: 0.2, stage: 1, memory: "một" }),
        part({ id: "b", x: 0.8, y: 0.8, stage: 2, core: true }),
      ],
      false,
    );
    const audio = new FakeAudio(5, 0);
    const input = new Input();
    const bench = new Workbench(machineTwo, FEEL);
    const phase = new DisassemblePhase(input, audio, machineTwo, bench, 1);

    const tick = (confirm: boolean): void => {
      input.setActionState("test", "confirm", confirm);
      input.poll();
      audio.t += 1 / 60;
      phase.update();
    };
    for (let i = 0; i < 200; i++) tick(false);
    expect(phase.outcome).toBe("playing");

    tick(true); // tháo "a" (một lần bấm), câu ký ức hiện ra
    tick(false);
    expect(bench.removed.has("a")).toBe(true);
    expect(phase.outcome).toBe("playing");

    for (let i = 0; i < 120; i++) tick(false); // chữ chạy hết
    tick(true); // đóng câu
    tick(false);
    expect(phase.outcome).toBe("done");

    const second = new DisassemblePhase(input, audio, machineTwo, bench, 2);
    expect(second.outcome).toBe("playing");
    expect(bench.stage).toBe(2);
  });
});
