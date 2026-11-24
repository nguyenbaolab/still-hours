import { describe, expect, it } from "vitest";
import { Input } from "../core/input";
import { TICK_RATE } from "../core/config";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { DISTRACTION_FEEL, DRAW_FEEL, SKETCH_FEEL } from "../data/sketch-feel";
import { DrawerBot, release, StillHolderBot } from "../testing/bots";
import { LENGTH_FIXTURE, PAGE_FIXTURE, PAGE_NEVER_FIXTURE } from "../testing/fixtures";
import { FakeAudio, simulate } from "../testing/sim";
import { DodgePhase } from "./dodge-phase";
import { addDrawnBeats, dropPoint, PageState, pencilPickup } from "./page";
import type { Pattern } from "../data/pattern-types";

const { arena } = BATTLE_LAYOUT;
const REVEAL_TICKS = Math.round((SKETCH_FEEL.replaySeconds + SKETCH_FEEL.revealSeconds) * TICK_RATE);

describe("bút: nhặt", () => {
  it("chỉ nhặt khi tâm bánh răng cách tâm bút ≤ pickupRadius", () => {
    const pencil = { x: 200, y: 150 };
    const r = DRAW_FEEL.pickupRadius;
    expect(pencilPickup({ x: 200 + r, y: 150 }, pencil, DRAW_FEEL, Infinity)).toBe(true);
    expect(pencilPickup({ x: 200 + r + 0.5, y: 150 }, pencil, DRAW_FEEL, Infinity)).toBe(false);
    expect(pencilPickup({ x: 200, y: 150 - r }, pencil, DRAW_FEEL, Infinity)).toBe(true);
  });

  it("không nhặt lại trong pickupDelaySeconds sau khi rơi", () => {
    const pencil = { x: 200, y: 150 };
    const gear = { x: 200, y: 150 };
    expect(pencilPickup(gear, pencil, DRAW_FEEL, 0)).toBe(false);
    expect(pencilPickup(gear, pencil, DRAW_FEEL, DRAW_FEEL.pickupDelaySeconds - 0.01)).toBe(false);
    expect(pencilPickup(gear, pencil, DRAW_FEEL, DRAW_FEEL.pickupDelaySeconds)).toBe(true);
  });
});

describe("bút: rơi", () => {
  const near = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

  it("văng phía đối diện đạn, cách đúng dropDistance khi không chạm mép", () => {
    const gear = { x: 320, y: 180 };
    const bullet = { x: 300, y: 180 };
    const p = dropPoint(gear, bullet, arena, DRAW_FEEL);
    expect(near(p, gear)).toBeCloseTo(DRAW_FEEL.dropDistance, 6);
    expect(p.x).toBeGreaterThan(gear.x);
    expect(p.y).toBeCloseTo(gear.y, 6);

    const above = dropPoint(gear, { x: 320, y: 200 }, arena, DRAW_FEEL);
    expect(above.y).toBeLessThan(gear.y);
    expect(above.x).toBeCloseTo(gear.x, 6);
  });

  it("luôn trong khung, cách mép ≥ dropMargin", () => {
    const corners = [
      { x: arena.x + 4, y: arena.y + 4 },
      { x: arena.x + arena.w - 4, y: arena.y + 4 },
      { x: arena.x + 4, y: arena.y + arena.h - 4 },
      { x: arena.x + arena.w - 4, y: arena.y + arena.h - 4 },
    ];
    for (const gear of corners) {
      for (let deg = 0; deg < 360; deg += 15) {
        const rad = (deg * Math.PI) / 180;
        const bullet = { x: gear.x + Math.cos(rad) * 10, y: gear.y + Math.sin(rad) * 10 };
        const p = dropPoint(gear, bullet, arena, DRAW_FEEL);
        expect(p.x).toBeGreaterThanOrEqual(arena.x + DRAW_FEEL.dropMargin - 1e-9);
        expect(p.x).toBeLessThanOrEqual(arena.x + arena.w - DRAW_FEEL.dropMargin + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(arena.y + DRAW_FEEL.dropMargin - 1e-9);
        expect(p.y).toBeLessThanOrEqual(arena.y + arena.h - DRAW_FEEL.dropMargin + 1e-9);
      }
    }
  });

  it("đạn nằm đúng tâm bánh răng thì văng lên trên, không ra NaN", () => {
    const p = dropPoint({ x: 320, y: 180 }, { x: 320, y: 180 }, arena, DRAW_FEEL);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeLessThan(180);
  });
});

describe("kim đồng hồ của cô bé", () => {
  it("drawnBeats chỉ tăng khi cầm bút VÀ có di chuyển", () => {
    expect(addDrawnBeats(3, true, true, 0.1)).toBeCloseTo(3.1, 9);
    expect(addDrawnBeats(3, false, true, 0.1)).toBe(3);
    expect(addDrawnBeats(3, true, false, 0.1)).toBe(3);
    expect(addDrawnBeats(3, true, true, 0)).toBe(3);
  });

  it("tăng theo beat nghe được: hệ số nhịp 0,5 thì cùng thời gian thật chỉ tăng một nửa", () => {
    const run = (pace: number): number => {
      const tempo = new TempoMap(100);
      if (pace < 1) tempo.setPace(0, pace);
      let drawn = 0;
      for (let tick = 0; tick < 10 * TICK_RATE; tick++) {
        const delta = tempo.beatAtTime((tick + 1) / TICK_RATE) - tempo.beatAtTime(tick / TICK_RATE);
        drawn = addDrawnBeats(drawn, true, true, delta);
      }
      return drawn;
    };
    expect(run(0.5) / run(1)).toBeCloseTo(0.5, 3);
  });
});

/** Dựng pha né với đồng hồ giả. */
function setup(pattern: Pattern, page?: PageState) {
  const audio = new FakeAudio(5, 0.03);
  const input = new Input();
  const phase = new DodgePhase(input, audio, 18, pattern, page ? { page } : {});
  return { audio, input, phase, clock: phase["clock"], player: phase["player"], world: phase["world"] };
}

describe("DodgePhase: bút và trang", () => {
  it("bot đi tới bút rồi đi vòng chữ nhật: trang xong (won) trong ≤ 60 giây", () => {
    const { audio, input, phase, player } = setup(PAGE_FIXTURE);
    const bot = new DrawerBot(input, arena);
    simulate({
      seconds: 60,
      audio,
      step: () => {
        bot.act(player, phase.pencilPosition, phase.holdingPencil);
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    expect(audio.t - 5).toBeLessThanOrEqual(60);
    expect(phase.page?.sketch.count).toBeGreaterThan(20);
    expect(audio.cues).toContain("pencilUp");
    expect(audio.cues).toContain("drawTick");
  });

  it("thua rồi dựng pha mới với cùng PageState: nét và drawnBeats giữ nguyên", () => {
    const first = setup(PAGE_NEVER_FIXTURE);
    const bot = new DrawerBot(first.input, arena);
    let ticks = 0;
    simulate({
      seconds: 10,
      audio: first.audio,
      step: () => {
        bot.act(first.player, first.phase.pencilPosition, first.phase.holdingPencil);
        first.input.poll();
        first.phase.update();
        ticks++;
      },
    });
    const page = first.phase.page as PageState;
    expect(page.sketch.count).toBeGreaterThan(0);
    expect(page.drawnBeats).toBeGreaterThan(1);

    first.player.hp = 0;
    first.input.poll();
    first.phase.update();
    expect(first.phase.outcome).toBe("lost");
    const strokes = page.sketch.count;
    const drawn = page.drawnBeats;

    const second = setup(PAGE_NEVER_FIXTURE, page);
    expect(second.phase.page).toBe(page);
    // Bút về chỗ đặt ban đầu, chưa cầm; không có phím nào: nét và beat vẽ không đổi.
    expect(second.phase.holdingPencil).toBe(false);
    for (let i = 0; i < 200; i++) {
      second.input.poll();
      second.audio.t += 1 / TICK_RATE;
      second.phase.update();
    }
    expect(page.sketch.count).toBe(strokes);
    expect(page.drawnBeats).toBe(drawn);
    expect(ticks).toBeGreaterThan(0);
  });

  it("chạm đạn xao nhãng khi không cầm bút: không rơi gì, đạn không bị tiêu thụ", () => {
    const { input, phase, player, world } = setup(PAGE_NEVER_FIXTURE);
    world.step(0, 0);
    world.spawnDistraction(player.x, player.y, 0, 0, DISTRACTION_FEEL.radius, DISTRACTION_FEEL.sprite, 0);
    const hp = player.hp;
    input.poll();
    phase.update();
    expect(world.distractions.size).toBeGreaterThan(0);
    expect(phase.holdingPencil).toBe(false);
    expect(player.hp).toBe(hp);
  });

  it("chạm đạn xao nhãng khi cầm bút: bút rơi, nét giữ nguyên, không trừ máu, đạn biến mất", () => {
    const { audio, input, phase, player, world, clock } = setup(PAGE_NEVER_FIXTURE);
    const bot = new DrawerBot(input, arena);
    simulate({
      seconds: 8,
      audio,
      step: () => {
        bot.act(player, phase.pencilPosition, phase.holdingPencil);
        input.poll();
        phase.update();
      },
    });
    expect(phase.holdingPencil).toBe(true);
    const page = phase.page as PageState;
    const strokes = page.sketch.count;
    expect(strokes).toBeGreaterThan(0);
    const hp = player.hp;

    release(input);
    world.step(clock.time, clock.beat);
    const before = world.distractions.size;
    world.spawnDistraction(player.x - 8, player.y, 0, 0, DISTRACTION_FEEL.radius, DISTRACTION_FEEL.sprite, clock.time);
    input.poll();
    audio.t += 1 / TICK_RATE;
    phase.update();

    expect(phase.holdingPencil).toBe(false);
    expect(player.hp).toBe(hp);
    expect(page.sketch.count).toBeGreaterThanOrEqual(strokes);
    expect(world.distractions.size).toBeLessThanOrEqual(before);
    expect(audio.cues).toContain("pencilDrop");
    // Bút văng khỏi bánh răng một quãng, về phía đối diện đạn (đạn ở bên trái nên bút sang phải).
    expect(phase.pencilPosition.x).toBeGreaterThan(player.x);
  });

  it("hệ số nhịp 0,5 thì cùng thời gian thật vẽ được ít beat hơn", () => {
    const measure = (pace: number): number => {
      const { audio, input, phase, player, clock } = setup(PAGE_NEVER_FIXTURE);
      if (pace < 1) clock.tempo.setPace(0, pace);
      const bot = new DrawerBot(input, arena);
      let heldSince = -1;
      let result = 0;
      simulate({
        seconds: 30,
        audio,
        step: () => {
          bot.act(player, phase.pencilPosition, phase.holdingPencil);
          input.poll();
          phase.update();
          if (phase.holdingPencil && heldSince < 0) heldSince = audio.t;
          if (heldSince >= 0 && audio.t - heldSince >= 8 && result === 0) result = (phase.page as PageState).drawnBeats;
        },
        stopWhen: () => result > 0,
      });
      return result;
    };
    expect(measure(0.5) / measure(1)).toBeGreaterThan(0.4);
    expect(measure(0.5) / measure(1)).toBeLessThan(0.6);
  });
});

describe("DodgePhase: trang luôn khép được", () => {
  /** Chạy cho tới khi pha xong; trả về số tick từ lúc trang bắt đầu khép tới lúc `won`, và beat lúc bắt đầu khép. */
  function runToWin(bot: (s: ReturnType<typeof setup>) => void, pattern: Pattern, page?: PageState) {
    const s = setup(pattern, page);
    let revealFrom = -1;
    let revealBeat = -1;
    let tick = 0;
    simulate({
      seconds: 120,
      audio: s.audio,
      step: () => {
        bot(s);
        s.input.poll();
        s.phase.update();
        tick++;
        if (revealFrom < 0 && s.phase["stage"] === "reveal") {
          revealFrom = tick;
          revealBeat = s.clock.beat;
        }
      },
      stopWhen: () => s.phase.outcome !== "playing",
    });
    return { ...s, revealTicks: tick - revealFrom, revealBeat, won: s.phase.outcome === "won" };
  }

  const MAX_BEAT = DRAW_FEEL.maxLoops * PAGE_NEVER_FIXTURE.lengthBeats;

  it("(a) bot không bấm phím nào: won ngay sau mốc maxLoops vòng cộng thời gian lộ tranh, không có nét nào", () => {
    const r = runToWin(() => undefined, PAGE_NEVER_FIXTURE);
    expect(r.won).toBe(true);
    expect(r.revealBeat).toBeGreaterThanOrEqual(MAX_BEAT);
    expect(r.revealBeat).toBeLessThan(MAX_BEAT + 0.2);
    expect(Math.abs(r.revealTicks - REVEAL_TICKS)).toBeLessThanOrEqual(1);
    expect(r.phase.page?.sketch.count).toBe(0);
  });

  it("(b) bot cầm bút rồi đứng yên: cũng won đúng mốc đó, drawnBeats gần 0", () => {
    let still: StillHolderBot | null = null;
    const r = runToWin((s) => {
      still ??= new StillHolderBot(s.input);
      still.act(s.player, s.phase.pencilPosition, s.phase.holdingPencil);
    }, PAGE_NEVER_FIXTURE);
    expect(r.won).toBe(true);
    expect(r.revealBeat).toBeGreaterThanOrEqual(MAX_BEAT);
    expect(r.revealBeat).toBeLessThan(MAX_BEAT + 0.2);
    expect(Math.abs(r.revealTicks - REVEAL_TICKS)).toBeLessThanOrEqual(1);
    expect(r.phase.page?.drawnBeats ?? 99).toBeLessThan(1);
  });

  it("(c) bot vẽ đủ trước mốc: won sớm, không chờ tới mốc", () => {
    let drawer: DrawerBot | null = null;
    const r = runToWin((s) => {
      drawer ??= new DrawerBot(s.input, arena);
      drawer.act(s.player, s.phase.pencilPosition, s.phase.holdingPencil);
    }, PAGE_FIXTURE);
    expect(r.won).toBe(true);
    expect(r.revealBeat).toBeLessThan(MAX_BEAT - 4);
    expect(r.phase.page?.drawnBeats ?? 0).toBeGreaterThanOrEqual(20);
  });

  it("(d) thua rồi dựng pha mới với cùng PageState: mốc đếm lại từ beat 0 của lần mới", () => {
    const first = setup(PAGE_NEVER_FIXTURE);
    first.player.hp = 0;
    first.input.poll();
    first.phase.update();
    expect(first.phase.outcome).toBe("lost");
    const page = first.phase.page as PageState;
    const r = runToWin(() => undefined, PAGE_NEVER_FIXTURE, page);
    expect(r.won).toBe(true);
    expect(r.revealBeat).toBeGreaterThanOrEqual(MAX_BEAT);
    expect(r.revealBeat).toBeLessThan(MAX_BEAT + 0.2);
  });
});

describe("DodgePhase: finish length", () => {
  it("bot đứng yên ở pattern không đạn: won đúng lúc beat ≥ lengthBeats, không bao giờ thua", () => {
    const { audio, input, phase, clock } = setup(LENGTH_FIXTURE);
    let beatAtWin = Number.NaN;
    let beatBefore = Number.NaN;
    simulate({
      seconds: 60,
      audio,
      step: () => {
        beatBefore = clock.beat;
        input.poll();
        phase.update();
        if (Number.isNaN(beatAtWin) && phase.outcome === "won") beatAtWin = clock.beat;
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    expect(beatAtWin).toBeGreaterThanOrEqual(LENGTH_FIXTURE.lengthBeats);
    expect(beatBefore).toBeLessThan(LENGTH_FIXTURE.lengthBeats);
  });

  it("pha thua đóng băng: sau lost không còn đổi gì", () => {
    const { input, phase, player } = setup(LENGTH_FIXTURE);
    player.hp = 0;
    input.poll();
    phase.update();
    expect(phase.outcome).toBe("lost");
    for (let i = 0; i < 600; i++) {
      input.poll();
      phase.update();
    }
    expect(phase.outcome).toBe("lost");
  });
});

// Dùng `release` để không bị cảnh báo "unused" nếu bớt test; thả phím của bot là việc thật của test chạm đạn.
void release;
