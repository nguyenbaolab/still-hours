import { describe, expect, it } from "vitest";
import { GameEvents, type GameEventMap, type GameEventName } from "../core/game-events";
import { Input } from "../core/input";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { BOSS_ROUNDS } from "../data/patterns/boss";
import { HUD_FEEL } from "../data/hud-feel";
import type { Mechanism, Part } from "../data/mechanisms/types";
import type { Pattern } from "../data/pattern-types";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { FakeAudio } from "../testing/sim";
import { DisassemblePhase } from "./disassemble-phase";
import { DodgePhase } from "./dodge-phase";
import { Workbench } from "./mechanism";
import { soloContext } from "./progress";

/** Điểm phát sự kiện chính của hai pha (docs/events.md). Mỗi test dùng một bộ phát riêng, không đụng `gameEvents` dùng chung. */

type Seen = { name: GameEventName; event: GameEventMap[GameEventName] };

function listen(events: GameEvents): Seen[] {
  const seen: Seen[] = [];
  for (const name of ["score", "mistake", "nearWin", "stuck", "clear"] as const) {
    events.on(name, (event) => seen.push({ name, event }));
  }
  return seen;
}

const names = (seen: Seen[]): GameEventName[] => seen.map((item) => item.name);
const of = <N extends GameEventName>(seen: Seen[], name: N): GameEventMap[N][] =>
  seen.filter((item) => item.name === name).map((item) => item.event as GameEventMap[N]);

// ── Pha né ────────────────────────────────────────────────────────────────────────────────────────────────────

function runDodge(pattern: Pattern, events: GameEvents, seconds: number, extra: { maxHp?: number; losses?: number } = {}) {
  const audio = new FakeAudio(5, 0);
  const input = new Input();
  const phase = new DodgePhase(input, audio, 18, pattern, {
    context: soloContext({ events, resident: "r1", round: 2, ...extra }),
  });
  for (let i = 0; i < seconds * 60 && phase.outcome === "playing"; i++) {
    input.poll();
    audio.t += 1 / 60;
    phase.update();
  }
  return phase;
}

const empty: Pattern = { name: "trống", bpm: 120, lengthBeats: 16, loop: false, finish: { kind: "length" }, events: [] };

describe("DodgePhase: score và nearWin theo mốc tiến độ", () => {
  it("qua 25 / 50 / 75% thì ghi 5 điểm mỗi mốc theo thứ tự, rồi nearWin một lần; không phát clear (BattleScene làm)", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const phase = runDodge(empty, events, 30);
    expect(phase.outcome).toBe("won");

    const scores = of(seen, "score");
    expect(scores.map((e) => e.detail)).toEqual([0.25, 0.5, 0.75]);
    expect(scores.map((e) => e.points)).toEqual([HUD_FEEL.points.milestone, HUD_FEEL.points.milestone, HUD_FEEL.points.milestone]);
    expect(scores.map((e) => e.total)).toEqual([5, 10, 15]);
    expect(scores[0]).toMatchObject({ reason: "milestone", resident: "r1", round: 2, phase: "dodge" });

    expect(names(seen)).toEqual(["score", "score", "score", "nearWin"]);
    const near = of(seen, "nearWin")[0];
    expect(near?.progress).toBeGreaterThanOrEqual(HUD_FEEL.nearWinFraction);
    expect(near?.hp).toBe(PLAYER_FEEL.maxHp);
    expect(phase.progress).toBe(1);
  });

  it("tổng điểm tiếp tục từ bảng điểm của trận (không đặt lại giữa các pha)", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const audio = new FakeAudio(5, 0);
    const input = new Input();
    const context = soloContext({ events });
    context.score.add(40);
    const phase = new DodgePhase(input, audio, 18, empty, { context });
    for (let i = 0; i < 30 * 60 && phase.outcome === "playing"; i++) {
      input.poll();
      audio.t += 1 / 60;
      phase.update();
    }
    expect(of(seen, "score").map((e) => e.total)).toEqual([45, 50, 55]);
    expect(context.score.total).toBe(55);
  });
});

describe("DodgePhase: mistake khi trúng đạn, hp và máu tối đa theo cư dân", () => {
  const shooter: Pattern = {
    name: "bắn",
    bpm: 120,
    lengthBeats: 64,
    loop: false,
    finish: { kind: "length" },
    events: Array.from({ length: 20 }, (_, i) => ({
      beat: 2 + i * 2,
      type: "aimed" as const,
      from: "top" as const,
      at: 0.5,
      count: 1,
      damage: 4,
    })),
  };

  it("mỗi lần mất máu phát một mistake `hit` với máu vừa mất và máu còn lại; đứng yên thì cuối cùng thua", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const phase = runDodge(shooter, events, 60);
    expect(phase.outcome).toBe("lost");
    const hits = of(seen, "mistake");
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]).toMatchObject({ kind: "hit", damage: 4, hp: PLAYER_FEEL.maxHp - 4, maxHp: PLAYER_FEEL.maxHp, resident: "r1", round: 2 });
    // Máu chỉ giảm, và số lần trúng khớp với máu đã mất.
    for (let i = 1; i < hits.length; i++) expect(hits[i]?.hp as number).toBeLessThan(hits[i - 1]?.hp as number);
    expect(hits.at(-1)?.hp).toBe(0);
    expect(hits).toHaveLength(Math.ceil(PLAYER_FEEL.maxHp / 4));
    // Thua thì không có nearWin.
    expect(of(seen, "nearWin")).toHaveLength(0);
  });

  it("máu tối đa lấy từ ngữ cảnh (cư dân nhiều máu hơn thì trúng nhiều lần hơn mới thua)", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const phase = runDodge(shooter, events, 120, { maxHp: 32 });
    expect(phase.maxHp).toBe(32);
    expect(phase.outcome).toBe("lost");
    expect(of(seen, "mistake")).toHaveLength(32 / 4);
    expect(of(seen, "mistake")[0]?.maxHp).toBe(32);
  });

  it("đạn không trừ máu (chữ, xao nhãng) không phát mistake; bất tử không phát lần hai trong một nhịp trúng", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const phase = runDodge(empty, events, 30);
    expect(phase.outcome).toBe("won");
    expect(of(seen, "mistake")).toHaveLength(0);
  });
});

describe("DodgePhase: chơi lại sau khi thua (boss mang số vòng)", () => {
  it("các mốc dưới mức tiến độ lúc bắt đầu không ghi điểm dồn một lúc ở tick đầu", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const audio = new FakeAudio(5, 0);
    const input = new Input();
    const boss = BOSS_ROUNDS[0];
    const phase = new DodgePhase(input, audio, 18, boss, { loopsSeen: 2, context: soloContext({ events, resident: "boss" }) });
    for (let i = 0; i < 90; i++) {
      input.poll();
      audio.t += 1 / 60;
      phase.update();
    }
    // 2 vòng trên 3 = 0,67 lúc bắt đầu: mốc 0,25 và 0,5 đã qua rồi, mốc 0,75 chưa tới.
    expect(of(seen, "score")).toHaveLength(0);
    expect(phase.progress).toBeGreaterThanOrEqual(2 / 3 - 1e-9);
  });
});

describe("DodgePhase: không có ngữ cảnh thì chạy riêng và không hỏng", () => {
  it("mặc định phát vào bộ phát dùng chung với resident null", () => {
    const audio = new FakeAudio(5, 0);
    const input = new Input();
    const phase = new DodgePhase(input, audio, 18, empty);
    for (let i = 0; i < 60; i++) {
      input.poll();
      audio.t += 1 / 60;
      phase.update();
    }
    expect(phase.maxHp).toBe(PLAYER_FEEL.maxHp);
    expect(BATTLE_LAYOUT.arena.w).toBeGreaterThan(0);
    expect(BULLET_FEEL.damage).toBeGreaterThan(0);
  });
});

// ── Pha tháo ──────────────────────────────────────────────────────────────────────────────────────────────────

function part(overrides: Partial<Part> & Pick<Part, "id" | "x" | "y">): Part {
  return {
    sprite: "screw",
    hit: { x: overrides.x - 0.05, y: overrides.y - 0.05, w: 0.1, h: 0.1 },
    blockedBy: [],
    operation: "unhook",
    ...overrides,
  };
}

function runner(mechanism: Mechanism, events: GameEvents, stage = 1) {
  const audio = new FakeAudio(5, 0);
  const input = new Input();
  const bench = new Workbench(mechanism, { beatWindow: 0.2, unscrewSteps: 3, liftBeats: 2, blockFlashBeats: 1, memoryCharsPerSecond: 28 });
  const phase = new DisassemblePhase(input, audio, mechanism, bench, stage, soloContext({ events, resident: "r2", round: stage }));
  const tick = (press = false, arrow?: "left" | "right"): void => {
    input.setActionState("test", "confirm", press);
    input.setActionState("test", "left", arrow === "left");
    input.setActionState("test", "right", arrow === "right");
    input.poll();
    audio.t += 1 / 60;
    phase.update();
  };
  const idle = (seconds: number): void => {
    for (let i = 0; i < seconds * 60; i++) tick();
  };
  return { phase, bench, tick, idle, audio };
}

const four: Mechanism = {
  name: "bốn",
  bpm: 100,
  rhythmic: false,
  parts: [
    part({ id: "a", x: 0.1, y: 0.2 }),
    part({ id: "b", x: 0.3, y: 0.2 }),
    part({ id: "c", x: 0.5, y: 0.2 }),
    part({ id: "d", x: 0.7, y: 0.2, core: true }),
  ],
};

describe("DisassemblePhase: score khi tháo xong bộ phận, nearWin ở bộ phận gần cuối", () => {
  it("mỗi bộ phận tháo xong ghi 10 điểm với id bộ phận; nearWin đúng một lần khi còn một bộ phận", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const r = runner(four, events);
    r.idle(1);
    for (let i = 0; i < 4; i++) {
      r.tick(true);
      r.tick(false);
    }
    expect(r.bench.removed.size).toBe(4);
    expect(r.phase.outcome).toBe("done");
    const scores = of(seen, "score");
    expect(scores).toHaveLength(4);
    expect(scores.every((e) => e.reason === "part" && e.points === HUD_FEEL.points.part && e.phase === "disassemble")).toBe(true);
    expect(scores.map((e) => e.total)).toEqual([10, 20, 30, 40]);
    expect(new Set(scores.map((e) => e.detail))).toEqual(new Set(["a", "b", "c", "d"]));
    expect(of(seen, "nearWin")).toHaveLength(1);
    // nearWin phát sau khi bộ phận thứ ba tháo xong, trước bộ phận cuối.
    const order = names(seen);
    expect(order.indexOf("nearWin")).toBeGreaterThan(order.indexOf("score"));
    expect(order.indexOf("nearWin")).toBeLessThan(order.lastIndexOf("score"));
  });
});

describe("DisassemblePhase: mistake khi bấm sai", () => {
  it("bấm lệch nhịp (máy có nhịp) phát off-beat và không ghi điểm", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const rhythmic: Mechanism = { ...four, rhythmic: true };
    const r = runner(rhythmic, events);
    // Chờ tới nửa beat (xa nhất khỏi beat nguyên) rồi bấm.
    for (let i = 0; i < 20 * 60; i++) {
      r.tick();
      const beat = r.phase["clock"].beat as number;
      if (beat > 2 && Math.abs(beat - Math.round(beat)) > 0.45) break;
    }
    r.tick(true);
    const mistakes = of(seen, "mistake");
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toMatchObject({ kind: "off-beat", resident: "r2", phase: "disassemble" });
    expect(of(seen, "score")).toHaveLength(0);
  });

  it("bấm bộ phận còn bị chặn phát blocked", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const blocked: Mechanism = {
      ...four,
      parts: [part({ id: "a", x: 0.2, y: 0.2 }), part({ id: "b", x: 0.8, y: 0.2, blockedBy: ["a"], core: true })],
    };
    const r = runner(blocked, events);
    r.idle(0.5);
    r.tick(false, "right"); // chọn b
    r.tick(true);
    expect(of(seen, "mistake").map((e) => e.kind)).toEqual(["blocked"]);
  });
});

describe("DisassemblePhase: stuck khi lâu không tiến bộ", () => {
  it("không làm gì quá idleSeconds thì phát stuck với bộ phận đang chọn, rồi nhắc lại mỗi chừng đó giây", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const r = runner(four, events);
    r.idle(HUD_FEEL.idleSeconds - 1);
    expect(of(seen, "stuck")).toHaveLength(0);
    r.idle(2);
    expect(of(seen, "stuck")).toHaveLength(1);
    const first = of(seen, "stuck")[0];
    expect(first).toMatchObject({ reason: "idle", resident: "r2", phase: "disassemble", partId: r.bench.selectedId });
    expect(first?.amount).toBeGreaterThanOrEqual(HUD_FEEL.idleSeconds);
    r.idle(HUD_FEEL.idleSeconds);
    expect(of(seen, "stuck")).toHaveLength(2);
  });

  it("tháo xong một bộ phận thì bộ đếm kẹt về 0", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const r = runner(four, events);
    r.idle(HUD_FEEL.idleSeconds - 2);
    r.tick(true);
    r.tick(false);
    r.idle(HUD_FEEL.idleSeconds - 2);
    expect(of(seen, "stuck")).toHaveLength(0);
    r.idle(3);
    expect(of(seen, "stuck")).toHaveLength(1);
  });

  it("giữ nhấc (lift) tính là đang làm, không kẹt", () => {
    const events = new GameEvents();
    const seen = listen(events);
    const lift: Mechanism = { name: "nhấc", bpm: 100, rhythmic: false, parts: [part({ id: "a", x: 0.5, y: 0.5, operation: "lift", core: true })] };
    const r = runner(lift, events);
    // Giữ confirm 30 giây liên tục: sẽ nhấc xong rất sớm, nên phase done; không có stuck nào.
    for (let i = 0; i < 30 * 60 && r.phase.outcome === "playing"; i++) r.tick(true);
    expect(r.phase.outcome).toBe("done");
    expect(of(seen, "stuck")).toHaveLength(0);
  });
});
