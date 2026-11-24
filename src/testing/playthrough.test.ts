import { describe, expect, it } from "vitest";
import { DodgePhase } from "../battle/dodge-phase";
import { DisassemblePhase } from "../battle/disassemble-phase";
import { neighborId, stageOf, Workbench, type Direction } from "../battle/mechanism";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { DISASSEMBLY_FEEL } from "../data/disassembly-feel";
import { PLAYER_FEEL } from "../data/feel";
import { FLOW_FEEL } from "../data/flow-feel";
import type { Pattern } from "../data/pattern-types";
import { RESIDENTS } from "../data/residents";
import { DRAW_FEEL } from "../data/sketch-feel";
import type { Mechanism } from "../data/mechanisms/types";
import { DodgerBot } from "./dodger";
import { FakeAudio, simulate } from "./sim";

/**
 * Chạy thử trọn vòng bằng bot (mốc 6.6): mọi lượt né của mọi cư dân bằng bot né đạn có nhìn cảnh báo (cộng hành vi riêng:
 * nhặt bút cho Linh, đi ra khe cho ông Khải), và mọi tầng của mọi máy bằng bot tháo đúng nhịp. Số lần thua của bot được
 * in ra (không phải lỗi); lượt nào bot thua quá 3 lần thì ghi vào PLAYTEST.md, "Chỗ không chắc".
 */

const { arena } = BATTLE_LAYOUT;
const MAX_ATTEMPTS = 12;
const ATTEMPT_SECONDS = 150;
const START = 5;

interface RoundReport {
  who: string;
  round: number;
  won: boolean;
  losses: number;
  seconds: number;
  scriptSeconds: number;
  dropped: number;
  /** Beat đã vẽ lúc xong lượt (chỉ lượt `page`). */
  drawn: number | null;
}

/** Thời gian kịch bản (giây) của `beats` beat đầu của lượt, theo BPM kịch bản và sự kiện `tempo`. */
function scriptSeconds(pattern: Pattern, beats: number): number {
  const tempo = new TempoMap(pattern.bpm ?? 100);
  for (const event of pattern.events) if (event.type === "tempo") tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  return tempo.scriptTimeAtBeat(beats);
}

function playRound(who: string, round: number, pattern: Pattern): RoundReport {
  let loops = 0;
  let page: DodgePhase["page"] = null;
  let losses = 0;
  let dropped = 0;
  let seconds = 0;
  let won = false;
  let drawn: number | null = null;
  let corner = 0;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !won; attempt++) {
    const audio = new FakeAudio(START, 0.03);
    const input = new Input();
    const phase = new DodgePhase(input, audio, 18, pattern, { ...(page ? { page } : {}), loopsSeen: loops });
    const player = phase["player"];
    const world = phase["world"];
    const clock = phase["clock"];
    const bot = new DodgerBot(input);
    const finish = pattern.finish;
    simulate({
      seconds: START + ATTEMPT_SECONDS,
      audio,
      step: () => {
        const beatsPerSecond = clock.tempo.bpmAtBeat(Math.max(0, clock.beat)) / 60;
        const base = { arena, beatsPerSecond, hitHalf: PLAYER_FEEL.hitboxSize / 2, speed: PLAYER_FEEL.speed };
        if (finish?.kind === "page") {
          const holding = phase.holdingPencil;
          let goal = phase.pencilPosition;
          if (holding) {
            const m = 36;
            const corners = [
              { x: arena.x + m, y: arena.y + m },
              { x: arena.x + arena.w - m, y: arena.y + m },
              { x: arena.x + arena.w - m, y: arena.y + arena.h - m },
              { x: arena.x + m, y: arena.y + arena.h - m },
            ];
            goal = corners[corner % 4] as { x: number; y: number };
            if (Math.hypot(goal.x - player.x, goal.y - player.y) < 10) corner++;
          }
          bot.act(player, world, { ...base, goal, goalWeight: 0.5, avoidDistractions: holding });
        } else if (finish?.kind === "exit") {
          const view = phase["exit"];
          if (view) {
            const door = view.nextDoor;
            const along = (door.from + door.to) / 2;
            const out = view.open ? 300 : -10;
            const goal =
              door.side === "right"
                ? { x: arena.x + arena.w + out, y: along }
                : door.side === "left"
                  ? { x: arena.x - out, y: along }
                  : { x: along, y: arena.y - out };
            bot.act(player, world, { ...base, goal, goalWeight: view.open || view.warn ? 0.6 : 0.12, free: view.open });
          } else bot.act(player, world, base);
        } else bot.act(player, world, base);
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    dropped += world.dropped;
    seconds = audio.t - START;
    drawn = phase.page ? phase.page.drawnBeats : null;
    if (phase.outcome === "won") won = true;
    else {
      losses++;
      loops = phase.loopsSeen;
      page = phase.page;
    }
  }
  const length = finish(pattern);
  return { who, round, won, losses, seconds, scriptSeconds: length, dropped, drawn };
}

/** Thời gian kịch bản làm mốc so sánh: `length` thì cả lượt; `page` thì `maxLoops` vòng; `exit` thì 3 vòng. */
function finish(pattern: Pattern): number {
  const kind = pattern.finish?.kind ?? (pattern.loop ? "page" : "length");
  if (kind === "length") return scriptSeconds(pattern, pattern.lengthBeats);
  if (kind === "page") return scriptSeconds(pattern, DRAW_FEEL.maxLoops * pattern.lengthBeats);
  return scriptSeconds(pattern, 3 * pattern.lengthBeats);
}

const reports: RoundReport[] = [];

describe("chạy thử trọn vòng: mọi lượt né của mọi cư dân", () => {
  for (const resident of RESIDENTS) {
    resident.rounds.forEach((pattern, index) => {
      it(
        `${resident.id} lượt ${index + 1}: bot né đạn thắng (không lượt nào kẹt)`,
        () => {
          const report = playRound(resident.id, index + 1, pattern);
          reports.push(report);
          expect(report.won, `${resident.id} lượt ${index + 1} sau ${report.losses} lần thua`).toBe(true);
          expect(report.dropped, "pool không bao giờ đầy").toBe(0);
          // Lần thắng kết thúc không quá 2 lần độ dài kịch bản (cộng dạo đầu và dọn đạn / lộ tranh).
          const extra = 5 + FLOW_FEEL.clearSeconds + 10;
          expect(report.seconds, `${resident.id} lượt ${index + 1}`).toBeLessThanOrEqual(2 * report.scriptSeconds + extra);
        },
        120_000,
      );
    });
  }

  it("đối chứng: bánh răng đứng yên giữa khung thì thua ở mọi lượt của cư dân 1 (đạn có sát thương thật); các lượt khác chỉ in kết quả", () => {
    const lines: string[] = [];
    for (const resident of RESIDENTS) {
      for (const pattern of resident.rounds) {
        const id = resident.id;
        const audio = new FakeAudio(START, 0.03);
        const input = new Input();
        const phase = new DodgePhase(input, audio, 18, pattern);
        simulate({
          seconds: START + ATTEMPT_SECONDS,
          audio,
          step: () => {
            input.poll();
            phase.update();
          },
          stopWhen: () => phase.outcome !== "playing",
        });
        lines.push(`${id} ${pattern.name}: đứng yên ${phase.outcome === "lost" ? "thua" : phase.outcome === "won" ? "THẮNG" : "chưa xong"}`);
        if (id === "r1") expect(phase.outcome, `${id} ${pattern.name}`).toBe("lost");
      }
    }
    console.info(`\n${lines.join("\n")}`);
  });

  it("tổng kết số lần thua của bot", () => {
    const lines = reports.map(
      (r) => `${r.who} lượt ${r.round}: thua ${r.losses} lần, thắng sau ${r.seconds.toFixed(1)} s (kịch bản ${r.scriptSeconds.toFixed(1)} s)${r.drawn === null ? "" : `, đã vẽ ${r.drawn.toFixed(1)} beat`}`,
    );
    console.info(`\n${lines.join("\n")}`);
    const hard = reports.filter((r) => r.losses > 3).map((r) => `${r.who}.${r.round}`);
    console.info(`Lượt bot thua quá 3 lần: ${hard.length === 0 ? "không có" : hard.join(", ")}`);
    expect(reports.length).toBe(RESIDENTS.length * 3);
  });
});

// ── Bot tháo ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Hướng bấm đầu tiên trên đường ngắn nhất (theo `neighborId`) từ `from` tới `to` trong các bộ phận còn chọn được. */
function firstStep(parts: readonly { id: string; x: number; y: number }[], from: string, to: string): Direction | null {
  const dirs: Direction[] = ["up", "down", "left", "right"];
  const seen = new Map<string, Direction | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const dir of dirs) {
      const next = neighborId(parts, id, dir);
      if (next === null || seen.has(next)) continue;
      seen.set(next, seen.get(id) ?? dir);
      if (next === to) return seen.get(next) ?? dir;
      queue.push(next);
    }
  }
  return null;
}

function disassembleAll(mechanism: Mechanism): { removed: number; seconds: number[]; finished: boolean } {
  const bench = new Workbench(mechanism, DISASSEMBLY_FEEL);
  const stages = [1, 2, 3];
  const seconds: number[] = [];
  for (const stage of stages) {
    const audio = new FakeAudio(START, 0.03);
    const input = new Input();
    const phase = new DisassemblePhase(input, audio, mechanism, bench, stage);
    const clock = phase["clock"];
    let tick = 0;
    let lastPressBeat = -10;
    simulate({
      seconds: START + 150,
      audio,
      step: () => {
        tick++;
        let confirm = false;
        let arrow: Direction | null = null;
        if (bench.memory) {
          confirm = tick % 2 === 0;
        } else {
          const open = mechanism.parts.filter((p) => stageOf(p) <= stage && !bench.removed.has(p.id));
          const target = open.find((p) => p.blockedBy.every((id) => bench.removed.has(id)));
          if (target) {
            if (bench.selectedId !== target.id) {
              if (tick % 2 === 0) arrow = firstStep(open, bench.selectedId, target.id);
            } else if (target.operation === "lift") {
              confirm = true;
            } else {
              const beat = clock.beat;
              const near = Math.abs(beat - Math.round(beat)) <= 0.1;
              if (!mechanism.rhythmic) confirm = tick % 2 === 0;
              else if (near && Math.round(beat) !== lastPressBeat && tick % 2 === 0) {
                confirm = true;
                lastPressBeat = Math.round(beat);
              }
            }
          }
        }
        input.setActionState("bot", "confirm", confirm);
        for (const dir of ["up", "down", "left", "right"] as const) input.setActionState("bot", dir, arrow === dir);
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome === "done",
    });
    expect(phase.outcome, `${mechanism.name} tầng ${stage}`).toBe("done");
    seconds.push(audio.t - START);
  }
  return { removed: bench.removed.size, seconds, finished: bench.finished };
}

describe("chạy thử trọn vòng: mọi tầng của mọi máy", () => {
  for (const resident of RESIDENTS) {
    it(
      `${resident.id}: bot tháo đúng nhịp tháo hết ba tầng, core là bộ phận cuối`,
      () => {
        const result = disassembleAll(resident.mechanism);
        expect(result.removed).toBe(resident.mechanism.parts.length);
        expect(result.finished).toBe(true);
        // Mỗi tầng ~15 giây theo thiết kế; bot không được mất hơn 60 giây một tầng.
        for (const s of result.seconds) expect(s).toBeLessThan(60);
        console.info(`${resident.id} tháo: ${result.seconds.map((s) => `${s.toFixed(1)} s`).join(", ")}`);
        expect(TICK_RATE).toBe(60);
      },
      60_000,
    );
  }
});