import { describe, expect, it } from "vitest";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import type { Pattern, StraightEvent } from "../data/pattern-types";
import { RESIDENT3_PATTERN } from "../data/patterns/resident-3";
import { TEST_PATTERN } from "../data/patterns/test-pattern";
import { BULLET_FEEL, RHYTHM_FEEL } from "../data/rhythm-feel";
import { SYNC_FIXTURE } from "../testing/fixtures";
import { BulletWorld } from "./bullets";
import { PatternRunner, validatePattern } from "./pattern-runner";
import type { SpawnContext } from "./spawners";

const { arena } = BATTLE_LAYOUT;

describe("validatePattern: dữ liệu thật và quy tắc công bằng", () => {
  it("pattern thử trong src/data/patterns hợp lệ (bắt lỗi khi bạn sửa pattern)", () => {
    expect(validatePattern(TEST_PATTERN, BULLET_FEEL)).toEqual([]);
    expect(validatePattern(RESIDENT3_PATTERN, BULLET_FEEL)).toEqual([]);
  });

  it("fixture của test hợp lệ", () => {
    expect(validatePattern(SYNC_FIXTURE, BULLET_FEEL)).toEqual([]);
  });

  it("từ chối đạn lớn, vòng tròn/quạt và kim không có cảnh báo", () => {
    const problems = validatePattern(
      {
        name: "xấu",
        lengthBeats: 8,
        loop: false,
        events: [
          { beat: 1, type: "straight", from: "left", at: 0.5, radius: 12, telegraphBeats: 0 },
          { beat: 2, type: "burst", x: 0.5, y: 0.5, count: 8, telegraphBeats: 0 },
          { beat: 3, type: "sweep", x: 0.5, y: 0.5, length: 60, startAngleDeg: 0, degreesPerBeat: 30, durationBeats: 2, telegraphBeats: -1 },
          { beat: 4, type: "aimed", from: "top", at: 0.5, radius: BULLET_FEEL.bigRadius, telegraphBeats: 0 },
        ],
      },
      BULLET_FEEL,
    ).join("\n");

    expect(problems).toMatch(/sự kiện 0.*bắt buộc có cảnh báo/);
    expect(problems).toMatch(/sự kiện 1.*bắt buộc có cảnh báo/);
    expect(problems).toMatch(/sự kiện 2.*bắt buộc có cảnh báo/);
    expect(problems).toMatch(/sự kiện 3.*bắt buộc có cảnh báo/);
  });

  it("từ chối câu chữ không có cảnh báo", () => {
    const problems = validatePattern(
      {
        name: "chữ",
        lengthBeats: 8,
        loop: false,
        events: [{ beat: 2, type: "word", from: "left", at: 0.5, phrase: 0, telegraphBeats: 0 }],
      },
      BULLET_FEEL,
    ).join("\n");
    expect(problems).toMatch(/word.*bắt buộc có cảnh báo/);
  });

  it("đạn nhỏ được phép không cảnh báo; đạn lớn để mặc định thì tự có cảnh báo", () => {
    const pattern: Pattern = {
      name: "ổn",
      lengthBeats: 8,
      loop: false,
      events: [
        { beat: 1, type: "straight", from: "left", at: 0.5, telegraphBeats: 0 },
        { beat: 2, type: "straight", from: "left", at: 0.5, radius: 12 },
      ],
    };
    expect(validatePattern(pattern, BULLET_FEEL)).toEqual([]);
  });

  it("bắt các lỗi dữ liệu khác: beat ngoài vòng, vị trí ngoài [0,1], hàng đạn tràn cạnh, BPM âm", () => {
    const problems = validatePattern(
      {
        name: "lỗi",
        lengthBeats: 8,
        loop: false,
        events: [
          { beat: 9, type: "straight", from: "left", at: 0.5 },
          { beat: 4, type: "straight", from: "left", at: 1.5 },
          { beat: 5, type: "straight", from: "left", at: 0.8, count: 4, spacing: 0.2 },
          { beat: 6, type: "tempo", bpm: -5 },
          { beat: 7, type: "burst", x: 2, y: 0.5, count: 0 },
        ],
      },
      BULLET_FEEL,
    ).join("\n");

    expect(problems).toMatch(/sự kiện 0.*ngoài/);
    expect(problems).toMatch(/sự kiện 1.*at 1.5/);
    expect(problems).toMatch(/sự kiện 2.*tràn/);
    expect(problems).toMatch(/sự kiện 3.*bpm/);
    expect(problems).toMatch(/sự kiện 4/);
  });

  it("PatternRunner từ chối ngay khi tạo nếu pattern vi phạm", () => {
    const bad: Pattern = {
      name: "xấu",
      lengthBeats: 8,
      loop: false,
      events: [{ beat: 1, type: "burst", x: 0.5, y: 0.5, count: 8, telegraphBeats: 0 }],
    };
    expect(() => new PatternRunner(bad, new TempoMap(100), BULLET_FEEL, 100)).toThrow(/không hợp lệ/);
  });
});

/** Ghi lại một lần cảnh báo/đạn, kèm beat của bước mô phỏng mà nó xảy ra. */
interface Logged {
  beat: number;
}
interface LoggedTelegraph extends Logged {
  start: number;
  end: number;
}
interface LoggedDot extends Logged {
  fireTime: number;
  angle: number;
}

/** Chạy pattern theo beat (bước 0,01 beat) trên bản đồ tempo thật, ghi lại cảnh báo và đạn phát sinh. */
function runPattern(
  pattern: Pattern,
  toBeat: number,
  onStep?: (beat: number, ctx: SpawnContext) => void,
): { telegraphs: LoggedTelegraph[]; dots: LoggedDot[]; tempo: TempoMap } {
  const tempo = new TempoMap(pattern.bpm ?? RHYTHM_FEEL.defaultBpm);
  const world = new BulletWorld(arena, BULLET_FEEL);
  const runner = new PatternRunner(pattern, tempo, BULLET_FEEL, RHYTHM_FEEL.defaultBpm);
  const ctx: SpawnContext = { arena, world, feel: BULLET_FEEL, playerX: 0, playerY: 0 };

  const telegraphs: LoggedTelegraph[] = [];
  const dots: LoggedDot[] = [];
  let beat = -2;

  const addTelegraph = world.addTelegraph.bind(world);
  world.addTelegraph = (...args) => {
    telegraphs.push({ beat, start: args[6], end: args[7] });
    addTelegraph(...args);
  };
  const spawnDot = world.spawnDot.bind(world);
  world.spawnDot = (...args) => {
    spawnDot(...args);
    const dot = world.dots.at(world.dots.size - 1); // viên vừa được cấp
    dots.push({ beat, fireTime: args[6], angle: Math.atan2(dot.vy, dot.vx) });
  };

  for (let i = 0; beat < toBeat; i++) {
    beat = -2 + i * 0.01;
    world.step(tempo.timeAtBeat(beat), beat);
    onStep?.(beat, ctx);
    runner.update(beat, ctx);
  }
  return { telegraphs, dots, tempo };
}

const bigStraight = (beat: number, extra: Partial<StraightEvent> = {}): StraightEvent => ({
  beat,
  type: "straight",
  from: "right",
  at: 0.5,
  radius: 12,
  ...extra,
});

describe("thời lượng cảnh báo", () => {
  it("mặc định 1 beat ở tempo chậm (100 BPM = 0,6 s)", () => {
    const { telegraphs } = runPattern({ name: "t", bpm: 100, lengthBeats: 16, loop: false, events: [bigStraight(4)] }, 8);
    expect(telegraphs.length).toBeGreaterThan(0);
    for (const t of telegraphs) expect(t.end - t.start).toBeCloseTo(0.6, 6);
  });

  it("tempo nhanh thì không ngắn hơn telegraphMinSeconds (200 BPM: 1 beat chỉ 0,3 s nhưng cảnh báo 0,45 s)", () => {
    const { telegraphs } = runPattern({ name: "t", bpm: 200, lengthBeats: 16, loop: false, events: [bigStraight(4)] }, 8);
    for (const t of telegraphs) expect(t.end - t.start).toBeCloseTo(BULLET_FEEL.telegraphMinSeconds, 6);
  });

  it("telegraphBeats tùy chỉnh được (2 beat ở 100 BPM = 1,2 s)", () => {
    const { telegraphs } = runPattern({ name: "t", bpm: 100, lengthBeats: 16, loop: false, events: [bigStraight(6, { telegraphBeats: 2 })] }, 10);
    for (const t of telegraphs) expect(t.end - t.start).toBeCloseTo(1.2, 6);
  });

  it("tính theo tempo thật tại chỗ đó: giữa dốc tăng tốc 1 beat ngắn hơn lúc đầu", () => {
    const pattern: Pattern = {
      name: "dốc",
      bpm: 60,
      lengthBeats: 32,
      loop: false,
      events: [{ type: "tempo", beat: 0, bpm: 120, overBeats: 16 }, bigStraight(8, { telegraphBeats: 1 })],
    };
    const { telegraphs, tempo } = runPattern(pattern, 12);
    const expected = Math.max(tempo.timeAtBeat(8) - tempo.timeAtBeat(7), BULLET_FEEL.telegraphMinSeconds);
    for (const t of telegraphs) expect(t.end - t.start).toBeCloseTo(expected, 6);
  });

  it("cảnh báo luôn xuất hiện TRƯỚC đạn của nó và kết thúc đúng lúc đạn xuất hiện", () => {
    const { telegraphs, dots } = runPattern({ name: "t", bpm: 100, lengthBeats: 16, loop: false, events: [bigStraight(4)] }, 8);
    const firstDot = dots[0] as LoggedDot;
    for (const t of telegraphs) {
      expect(t.beat).toBeLessThan(firstDot.beat);
      expect(t.end).toBeCloseTo(firstDot.fireTime, 9);
    }
  });
});

describe("lặp vòng", () => {
  it("cảnh báo của đạn ngay đầu vòng sau bắt đầu từ cuối vòng trước", () => {
    const pattern: Pattern = { name: "lặp", bpm: 100, lengthBeats: 8, loop: true, events: [bigStraight(0.5)] };
    const { telegraphs, dots } = runPattern(pattern, 30);

    // Đạn ở beat 0.5, 8.5, 16.5, 24.5; cảnh báo 1 beat nên bắt đầu ở -0.5, 7.5, 15.5, 23.5.
    const fireBeats = [0.5, 8.5, 16.5, 24.5];
    const uniqueWarnBeats = [...new Set(telegraphs.map((t) => Math.round(t.beat * 10) / 10))];
    expect(dots.length).toBe(fireBeats.length);
    fireBeats.forEach((fire, i) => {
      expect((dots[i] as LoggedDot).beat).toBeCloseTo(fire, 1);
      expect(uniqueWarnBeats.some((warn) => Math.abs(warn - (fire - 1)) < 0.05)).toBe(true);
    });
  });

  it("BPM trở về BPM khởi đầu ở đầu mỗi vòng mới (không giữ nguyên tempo cuối vòng trước)", () => {
    const pattern: Pattern = {
      name: "tempo",
      bpm: 100,
      lengthBeats: 8,
      loop: true,
      events: [{ type: "tempo", beat: 4, bpm: 200, overBeats: 0 }],
    };
    const { tempo } = runPattern(pattern, 20);
    expect(tempo.bpmAtBeat(2)).toBe(100);
    expect(tempo.bpmAtBeat(5)).toBe(200);
    expect(tempo.bpmAtBeat(8.5)).toBe(100); // vòng 2 bắt đầu lại ở 100
    expect(tempo.bpmAtBeat(13)).toBe(200);
  });
});

describe("đạn nhắm vào người chơi: khóa hướng lúc nào", () => {
  const near = { x: arena.x + 40, y: arena.y + 120 };
  const far = { x: arena.x + 360, y: arena.y + 40 };
  /** Hướng (rad) từ điểm bắn của đạn `aimed` (giữa cạnh trên) tới một vị trí. */
  const angleTo = (p: { x: number; y: number }): number => Math.atan2(p.y - arena.y, p.x - (arena.x + arena.w / 2));

  /** Người chơi đứng ở `near` cho tới beat `moveAt`, rồi chạy sang `far`. */
  const player = (moveAt: number) => (beat: number, ctx: SpawnContext) => {
    const at = beat < moveAt ? near : far;
    ctx.playerX = at.x;
    ctx.playerY = at.y;
  };

  it("đạn có cảnh báo: khóa lúc BẮT ĐẦU cảnh báo, người chơi chạy đi sau đó thì đạn vẫn bay vào chỗ cũ", () => {
    // Đạn lớn (radius 10) bắn ở beat 6, cảnh báo từ beat 5. Người chơi rời `near` ở beat 5.5, giữa lúc cảnh báo.
    const pattern: Pattern = { name: "n", bpm: 100, lengthBeats: 16, loop: false, events: [{ beat: 6, type: "aimed", from: "top", at: 0.5, radius: 10 }] };
    const { dots } = runPattern(pattern, 8, player(5.5));
    const angle = (dots[0] as LoggedDot).angle;
    expect(Math.abs(angle - angleTo(near))).toBeLessThan(0.15);
    expect(Math.abs(angle - angleTo(far))).toBeGreaterThan(1); // điểm bắn nằm ngoài mép vài px nên cho dung sai 0,15 rad
  });

  it("đạn nhỏ không cảnh báo: nhắm vào vị trí người chơi ngay lúc bắn", () => {
    const pattern: Pattern = { name: "n", bpm: 100, lengthBeats: 16, loop: false, events: [{ beat: 6, type: "aimed", from: "top", at: 0.5 }] };
    const { dots } = runPattern(pattern, 8, player(5.5));
    const angle = (dots[0] as LoggedDot).angle;
    expect(Math.abs(angle - angleTo(far))).toBeLessThan(0.15);
  });
});
