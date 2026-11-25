import { describe, expect, it } from "vitest";
import type { Workbench } from "../battle/mechanism";
import type { DodgeOutcome } from "../battle/dodge-phase";
import type { PageState } from "../battle/page";
import type { RoundContext } from "../battle/progress";
import { GameEvents, type GameEventMap, type GameEventName } from "../core/game-events";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import type { Pattern } from "../data/pattern-types";
import { FLOW_FEEL } from "../data/flow-feel";
import { CLOCKWORK } from "../data/mechanisms/clockwork";
import type { ResidentData } from "../data/residents/types";
import { FakeAudio } from "../testing/sim";
import { BattleScene, type BattleFactory, type DisassembleLike, type DodgeLike } from "./battle-scene";

class FakeDodge implements DodgeLike {
  outcome: DodgeOutcome = "playing";
  updates = 0;
  gearPosition = { x: 300, y: 170 };
  loopsSeen = 0;
  hp = 20;
  maxHp = 20;
  /** `loopsSeen` mà `BattleScene` truyền vào lúc dựng. */
  carried = 0;
  context: RoundContext | null = null;
  constructor(
    readonly round: number,
    readonly pattern: Pattern,
    readonly page: PageState | null,
  ) {}
  update(): void {
    this.updates++;
  }
  render(): void {}
}

class FakeDisassemble implements DisassembleLike {
  outcome: "playing" | "done" = "playing";
  updates = 0;
  constructor(
    readonly stage: number,
    readonly bench: Workbench,
  ) {}
  update(): void {
    this.updates++;
  }
  render(): void {}
}

const plain: Pattern = { name: "thường", lengthBeats: 8, loop: false, finish: { kind: "length" }, events: [] };
const pencilRound: Pattern = {
  name: "bút",
  lengthBeats: 8,
  loop: true,
  finish: { kind: "page", drawBeats: 4 },
  pencil: { x: 0.5, y: 0.5 },
  events: [],
};

function setup(rounds: readonly [Pattern, Pattern, Pattern], startStep = 0, events?: GameEvents) {
  const log: string[] = [];
  const dodges: FakeDodge[] = [];
  const disassembles: FakeDisassemble[] = [];
  const factory: BattleFactory = {
    dodge(round, pattern, page, loopsSeen, context) {
      log.push(`dodge${round + 1}`);
      const phase = new FakeDodge(round, pattern, page);
      phase.carried = loopsSeen;
      phase.context = context;
      dodges.push(phase);
      return phase;
    },
    disassemble(stage, bench) {
      log.push(`dis${stage}`);
      const phase = new FakeDisassemble(stage, bench);
      disassembles.push(phase);
      return phase;
    },
  };
  const resident: ResidentData = {
    id: "r4",
    name: "thử",
    rounds,
    mechanism: CLOCKWORK,
    dialogue: { open: "r4Open", close: "r4Close", idle: "r4Idle" },
    vignette: "pencil",
  };
  const audio = new FakeAudio(5, 0);
  const input = new Input();
  const scene = new BattleScene(resident, input, audio, factory, (text) => text.length * 10, startStep, events ? { events } : {});
  const tick = (confirm = false): void => {
    input.setActionState("test", "confirm", confirm);
    input.poll();
    scene.update();
  };
  const ticksFor = (seconds: number): number => Math.ceil(seconds * TICK_RATE) + 1;
  return { scene, log, dodges, disassembles, audio, input, tick, ticksFor };
}

const FADE_TICKS = Math.ceil(FLOW_FEEL.fadeSeconds * TICK_RATE) + 1;
/** Một bước đổi pha: mờ ra, dựng pha mới, mờ vào. */
const STEP_TICKS = 2 * FADE_TICKS + 4;

describe("BattleScene: thứ tự một trận", () => {
  it("né 1 → tháo 1 → né 2 → tháo 2 → né 3 → tháo 3 → finished", () => {
    const s = setup([plain, plain, plain]);
    expect(s.log).toEqual(["dodge1"]);
    for (let step = 0; step < 6; step++) {
      expect(s.scene.finished).toBe(false);
      expect(s.scene.step).toBe(step);
      if (step % 2 === 0) (s.dodges.at(-1) as FakeDodge).outcome = "won";
      else (s.disassembles.at(-1) as FakeDisassemble).outcome = "done";
      for (let i = 0; i < STEP_TICKS; i++) s.tick();
    }
    expect(s.log).toEqual(["dodge1", "dis1", "dodge2", "dis2", "dodge3", "dis3"]);
    // Tháo xong tầng 3 chưa phải hết trận: còn hội thoại khép trận.
    expect(s.scene.finished).toBe(false);
    expect(s.scene.closingDialogue).toBe(true);
    expect(s.scene.current).toBeNull();
    for (let i = 0; i < 2000 && !s.scene.finished; i++) {
      s.tick(i % 2 === 0);
    }
    expect(s.scene.finished).toBe(true);
    expect(s.scene.closingDialogue).toBe(false);
  });

  it("hội thoại khép trận: hết dòng cuối mới finished, và phát tiếng blip", () => {
    const s = setup([plain, plain, plain]);
    for (let step = 0; step < 6; step++) {
      if (step % 2 === 0) (s.dodges.at(-1) as FakeDodge).outcome = "won";
      else (s.disassembles.at(-1) as FakeDisassemble).outcome = "done";
      for (let i = 0; i < STEP_TICKS; i++) s.tick();
    }
    expect(s.scene.closingDialogue).toBe(true);
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.audio.cues).toContain("blip");
    expect(s.scene.finished).toBe(false);
  });

  it("pha mới chỉ được dựng sau khi mờ hết, và chỉ chạy update sau đó", () => {
    const s = setup([plain, plain, plain]);
    (s.dodges[0] as FakeDodge).outcome = "won";
    const fadeTicks = Math.floor(FLOW_FEEL.fadeSeconds * TICK_RATE);
    for (let i = 0; i < fadeTicks - 2; i++) s.tick();
    expect(s.log).toEqual(["dodge1"]);
    for (let i = 0; i < 4; i++) s.tick();
    expect(s.log).toEqual(["dodge1", "dis1"]);
    expect((s.disassembles[0] as FakeDisassemble).updates).toBeLessThanOrEqual(3);
  });

  it("tháo dùng cùng một Workbench suốt trận, đúng số tầng", () => {
    const s = setup([plain, plain, plain]);
    for (let step = 0; step < 6; step++) {
      if (step % 2 === 0) (s.dodges.at(-1) as FakeDodge).outcome = "won";
      else (s.disassembles.at(-1) as FakeDisassemble).outcome = "done";
      for (let i = 0; i < STEP_TICKS; i++) s.tick();
    }
    expect(s.disassembles.map((d) => d.stage)).toEqual([1, 2, 3]);
    expect(new Set(s.disassembles.map((d) => d.bench)).size).toBe(1);
  });
});

describe("BattleScene: nhảy cóc vào giữa trận", () => {
  it("bắt đầu ở bước 3 (tháo lượt 2): tầng 1 đã tháo, pha đầu tiên là tháo tầng 2", () => {
    const { scene, log, disassembles } = setup([plain, plain, plain], 3);
    expect(scene.step).toBe(3);
    expect(log).toEqual(["dis2"]);
    const bench = disassembles[0]?.bench as Workbench;
    const stage1 = CLOCKWORK.parts.filter((p) => (p.stage ?? 1) === 1).map((p) => p.id);
    expect(stage1.length).toBeGreaterThan(0);
    for (const id of stage1) expect(bench.removed.has(id)).toBe(true);
    for (const p of CLOCKWORK.parts.filter((q) => (q.stage ?? 1) >= 2)) expect(bench.removed.has(p.id)).toBe(false);
  });

  it("bắt đầu ở bước 4 (né lượt 3): tầng 1 và 2 đã tháo", () => {
    const { scene, log } = setup([plain, plain, plain], 4);
    expect(scene.step).toBe(4);
    expect(log).toEqual(["dodge3"]);
  });
});

describe("BattleScene: thua", () => {
  function loseAtRound2(s: ReturnType<typeof setup>): void {
    // Qua né 1 và tháo 1, rồi tới né 2.
    (s.dodges[0] as FakeDodge).outcome = "won";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    (s.disassembles[0] as FakeDisassemble).outcome = "done";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    expect(s.log).toEqual(["dodge1", "dis1", "dodge2"]);
    (s.dodges[1] as FakeDodge).outcome = "lost";
  }

  it("lost ở né 2 → dựng lại né 2 (không quay về né 1, không chạy lại tháo 1)", () => {
    const s = setup([plain, plain, plain]);
    loseAtRound2(s);
    for (let i = 0; i < s.ticksFor(FLOW_FEEL.fadeSeconds + FLOW_FEEL.loseHoldSeconds + FLOW_FEEL.mendSeconds) + 5; i++) s.tick();
    expect(s.log).toEqual(["dodge1", "dis1", "dodge2", "dodge2"]);
    expect(s.dodges[2]?.round).toBe(1);
    expect(s.dodges[2]?.pattern).toBe(s.dodges[1]?.pattern);
    expect(s.dodges[2]).not.toBe(s.dodges[1]);
    expect(s.scene.step).toBe(2);
    expect(s.scene.finished).toBe(false);
  });

  it("màn thua: bánh răng nứt, cue mend khi lành, confirm bỏ qua phần giữ", () => {
    const s = setup([plain, plain, plain]);
    loseAtRound2(s);
    s.tick();
    expect(s.scene.gearSprite).toBe("gear-cracked");
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    // Đang giữ: bánh răng vẫn nứt, chưa lành, chưa dựng lại pha.
    expect(s.scene.gearSprite).toBe("gear-cracked");
    expect(s.audio.cues).not.toContain("mend");
    expect(s.log).toHaveLength(3);

    s.tick(true); // confirm bỏ qua phần giữ
    expect(s.scene.gearSprite).toBe("gear");
    expect(s.audio.cues).toContain("mend");
    for (let i = 0; i < s.ticksFor(FLOW_FEEL.mendSeconds) + 1; i++) s.tick();
    expect(s.log).toEqual(["dodge1", "dis1", "dodge2", "dodge2"]);
  });

  it("không bấm confirm thì phần giữ kéo đủ loseHoldSeconds", () => {
    const s = setup([plain, plain, plain]);
    loseAtRound2(s);
    let ticks = 0;
    while (!s.audio.cues.includes("mend") && ticks < 600) {
      s.tick();
      ticks++;
    }
    const expected = (FLOW_FEEL.fadeSeconds + FLOW_FEEL.loseHoldSeconds) * TICK_RATE;
    expect(Math.abs(ticks - expected)).toBeLessThanOrEqual(3);
  });

  it("pha né bị đóng băng lúc thua: không còn update", () => {
    const s = setup([plain, plain, plain]);
    loseAtRound2(s);
    const frozen = s.dodges[1] as FakeDodge;
    s.tick();
    const updates = frozen.updates;
    for (let i = 0; i < 30; i++) s.tick();
    expect(frozen.updates).toBe(updates);
  });

  it("thua nhiều lần liên tiếp vẫn về đúng pha né đó", () => {
    const s = setup([plain, plain, plain]);
    loseAtRound2(s);
    for (let attempt = 0; attempt < 3; attempt++) {
      for (let i = 0; i < 500; i++) {
        s.tick(true);
        if (s.dodges.length > 2 + attempt) break;
      }
      (s.dodges.at(-1) as FakeDodge).outcome = "lost";
    }
    expect(s.log.filter((entry) => entry === "dodge2")).toHaveLength(4);
    expect(s.log.filter((entry) => entry === "dis1")).toHaveLength(1);
  });
});

describe("BattleScene: số vòng đã qua (khe cửa của boss)", () => {
  it("thua giữ số vòng đã qua của lượt đó; sang lượt mới thì về 0", () => {
    const s = setup([plain, plain, plain]);
    expect(s.dodges[0]?.carried).toBe(0);
    const first = s.dodges[0] as FakeDodge;
    first.loopsSeen = 2;
    first.outcome = "lost";
    for (let i = 0; i < 400; i++) {
      s.tick(true);
      if (s.dodges.length > 1) break;
    }
    expect(s.dodges[1]?.carried).toBe(2);
    // Thua lần nữa, lần này đã qua 4 vòng (2 mang từ trước + 2 vòng mới).
    const second = s.dodges[1] as FakeDodge;
    second.loopsSeen = 4;
    second.outcome = "lost";
    for (let i = 0; i < 400; i++) {
      s.tick(true);
      if (s.dodges.length > 2) break;
    }
    expect(s.dodges[2]?.carried).toBe(4);
    // Thắng lượt 1, tháo xong, lượt 2: số vòng đặt lại.
    (s.dodges[2] as FakeDodge).outcome = "won";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    (s.disassembles[0] as FakeDisassemble).outcome = "done";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    expect(s.dodges.at(-1)?.round).toBe(1);
    expect(s.dodges.at(-1)?.carried).toBe(0);
  });
});
describe("BattleScene: trang vẽ", () => {
  it("với lượt có bút, PageState truyền vào pha né mới là cùng một đối tượng (qua thua và qua lượt)", () => {
    const s = setup([pencilRound, pencilRound, pencilRound]);
    const page = s.dodges[0]?.page;
    expect(page).not.toBeNull();
    expect(s.scene.page).toBe(page);

    (s.dodges[0] as FakeDodge).outcome = "lost";
    for (let i = 0; i < 400; i++) {
      s.tick(true);
      if (s.dodges.length > 1) break;
    }
    expect(s.dodges[1]?.page).toBe(page);

    // Thắng: lượt 1 xong thì vẽ tiếp lượt 2 trên cùng trang, nét lượt 1 thành "nét lượt trước".
    page?.sketch.sample(0, 0, false);
    page?.sketch.sample(30, 0, false);
    expect(page?.sketch.count).toBe(1);
    if (page) page.drawnBeats = 3;
    (s.dodges[1] as FakeDodge).outcome = "won";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    expect(page?.pastSegments).toBe(1);
    expect(page?.drawnBeats).toBe(0);

    (s.disassembles[0] as FakeDisassemble).outcome = "done";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    expect(s.dodges.at(-1)?.round).toBe(1);
    expect(s.dodges.at(-1)?.page).toBe(page);
  });

  it("lượt không có bút thì không có trang", () => {
    const s = setup([plain, plain, plain]);
    expect(s.dodges[0]?.page).toBeNull();
    expect(s.scene.page).toBeNull();
  });
});


/** Gom mọi sự kiện đã phát (tên + payload) để kiểm. */
function record(events: GameEvents): { name: GameEventName; event: GameEventMap[GameEventName] }[] {
  const seen: { name: GameEventName; event: GameEventMap[GameEventName] }[] = [];
  for (const name of ["score", "mistake", "nearWin", "stuck", "clear"] as const) {
    events.on(name, (event) => seen.push({ name, event }));
  }
  return seen;
}

describe("BattleScene: sao, sự kiện qua màn và kẹt", () => {
  it("thắng pha né thì chấm sao theo máu còn lại và phát clear (round); xong trận phát clear (battle) với tổng sao", () => {
    const events = new GameEvents();
    const seen = record(events);
    const s = setup([plain, plain, plain], 0, events);
    const hpPerRound = [20, 10, 3]; // 3 sao, 2 sao, 1 sao
    for (let step = 0; step < 6; step++) {
      if (step % 2 === 0) {
        const dodge = s.dodges.at(-1) as FakeDodge;
        dodge.hp = hpPerRound[step / 2] as number;
        dodge.outcome = "won";
      } else (s.disassembles.at(-1) as FakeDisassemble).outcome = "done";
      for (let i = 0; i < STEP_TICKS; i++) s.tick();
    }
    expect(s.scene.stars).toEqual([3, 2, 1]);
    const clears = seen.filter((item) => item.name === "clear").map((item) => item.event as GameEventMap["clear"]);
    expect(clears.map((c) => [c.scope, c.round, c.stars])).toEqual([
      ["round", 1, 3],
      ["round", 2, 2],
      ["round", 3, 1],
      ["battle", 3, 6],
    ]);
    expect(clears[0]?.resident).toBe("r4");
    expect(clears[0]?.hp).toBe(20);
    expect(clears[3]?.starsByRound).toEqual([3, 2, 1]);
  });

  it("truyền cho pha: lượt, sao các lượt trước, số lần thua, máu tối đa của cư dân; sang lượt thì số lần thua về 0", () => {
    const s = setup([plain, plain, plain]);
    const first = s.dodges.at(-1) as FakeDodge;
    expect(first.context?.round).toBe(1);
    expect(first.context?.losses).toBe(0);
    first.outcome = "lost";
    // Thua: mờ, giữ, lành, dựng lại.
    for (let i = 0; i < s.ticksFor(FLOW_FEEL.fadeSeconds + FLOW_FEEL.loseHoldSeconds + FLOW_FEEL.mendSeconds) + 5; i++) s.tick();
    const retry = s.dodges.at(-1) as FakeDodge;
    expect(retry).not.toBe(first);
    expect(retry.context?.losses).toBe(1);
    retry.hp = 20;
    retry.outcome = "won";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    const dis = s.disassembles.at(-1) as FakeDisassemble;
    dis.outcome = "done";
    for (let i = 0; i < STEP_TICKS; i++) s.tick();
    const second = s.dodges.at(-1) as FakeDodge;
    expect(second.context?.round).toBe(2);
    expect(second.context?.losses).toBe(0);
    expect(second.context?.stars).toEqual([3]);
    expect(second.context?.maxHp).toBe(20);
  });

  it("thua đủ stuckAfterLosses lần ở cùng một lượt thì phát stuck mỗi lần thua từ đó; trước đó thì không", () => {
    const events = new GameEvents();
    const seen = record(events);
    const s = setup([plain, plain, plain], 0, events);
    const loseOnce = (): void => {
      (s.dodges.at(-1) as FakeDodge).outcome = "lost";
      // Mờ, giữ, lành, rồi pha mới mờ vào (chỉ lúc đó mới đọc được outcome của nó).
      for (let i = 0; i < s.ticksFor(FLOW_FEEL.fadeSeconds + FLOW_FEEL.loseHoldSeconds + FLOW_FEEL.mendSeconds) + FADE_TICKS + 5; i++) s.tick();
    };
    loseOnce();
    loseOnce();
    expect(seen.filter((item) => item.name === "stuck")).toHaveLength(0);
    loseOnce();
    loseOnce();
    const stuck = seen.filter((item) => item.name === "stuck").map((item) => item.event as GameEventMap["stuck"]);
    expect(stuck.map((e) => e.amount)).toEqual([3, 4]);
    expect(stuck[0]).toMatchObject({ resident: "r4", round: 1, phase: "dodge", reason: "losses" });
  });
});
