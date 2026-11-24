import { beforeAll, describe, expect, it } from "vitest";
import { Input } from "../core/input";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { fixtureTime, SYNC_FIXTURE } from "../testing/fixtures";
import { FakeAudio, simulate } from "../testing/sim";
import type { BulletWorld } from "./bullets";
import { DodgePhase } from "./dodge-phase";

const START = 5; // giờ AudioContext lúc bắt đầu trận
// Một lần treo 1 giây. Chọn lúc để đạn dày ngay sau đó (đầu vòng thứ 6 của SYNC_FIXTURE: beat 2, 3, 4, 6...), nếu rơi vào
// đoạn yên tĩnh thì không có viên đạn nào để lộ việc đồng hồ nhịp bắt kịp chậm.
const STALL = { at: 86.3, length: 1 };

interface Spawn {
  /** Thời điểm lý thuyết (giây từ beat 0) đạn phải xuất hiện. */
  fireTime: number;
  /** Giờ của đồng hồ nhịp lúc đạn thật sự được sinh ra (tick xử lý nó). */
  clockTime: number;
  /** Giờ thô của AudioContext lúc đó. */
  ctxTime: number;
}

/**
 * Chạy DodgePhase THẬT (đúng thứ tự cập nhật của game) 3 phút trên đồng hồ âm thanh giả, có jitter khung hình
 * và một lần treo 1 giây, rồi ghi lại mọi tiếng được hẹn, mọi lần sinh đạn và mọi cảnh báo.
 */
function runScenario() {
  const audio = new FakeAudio(START, 0.03);
  const input = new Input();
  const phase = new DodgePhase(input, audio, 18, SYNC_FIXTURE);
  // Truy cập thành viên private bằng ngoặc vuông: chỉ để quan sát, không đổi hành vi.
  const clock = phase["clock"];
  const world: BulletWorld = phase["world"];

  const spawns: Spawn[] = [];
  const spawnDot = world.spawnDot.bind(world);
  world.spawnDot = (...args) => {
    spawns.push({ fireTime: args[6], clockTime: clock.time, ctxTime: audio.t });
    spawnDot(...args);
  };
  const spawnHand = world.spawnHand.bind(world);
  world.spawnHand = (...args) => {
    spawns.push({ fireTime: clock.tempo.timeAtBeat(args[6]), clockTime: clock.time, ctxTime: audio.t });
    spawnHand(...args);
  };
  const telegraphs: { start: number; end: number }[] = [];
  const addTelegraph = world.addTelegraph.bind(world);
  world.addTelegraph = (...args) => {
    telegraphs.push({ start: args[6], end: args[7] });
    addTelegraph(...args);
  };

  const frames = simulate({
    seconds: 180,
    audio,
    stall: STALL,
    step: () => {
      // Người chơi đứng yên bị đạn bắn trúng suốt 3 phút; pha thua khi hết máu, nên giữ máu đầy để pha chạy tiếp.
      phase["player"].hp = phase["player"].maxHp;
      input.poll();
      phase.update();
    },
  });

  return { audio, clock, world, spawns, telegraphs, frames, origin: clock.origin };
}

/**
 * Khoảng thời gian bị ảnh hưởng trực tiếp bởi lúc treo: đạn/tiếng vốn đến hạn TRONG lúc treo chỉ có thể xuất hiện ở khung
 * hình đầu tiên sau đó (trễ tới STALL.length). Cố ý hẹp: từ khung kế tiếp trở đi mọi thứ phải đúng giờ trở lại ngay.
 */
const inStall = (ctxTime: number): boolean => ctxTime > START + STALL.at - 0.1 && ctxTime < START + STALL.at + STALL.length + 0.05;

describe("đồng bộ nhịp: 3 phút có jitter khung hình và một lần treo 1 giây", () => {
  let run: ReturnType<typeof runScenario>;
  beforeAll(() => {
    run = runScenario();
  });

  it("mọi tiếng nằm đúng lưới beat theo tích phân số độc lập: không lệch dần", () => {
    const played = run.audio.plays.filter((p) => !p.cancelled);
    expect(played.length).toBeGreaterThan(300);
    let worst = 0;
    for (const p of played) {
      const beat = Math.round(run.clock.tempo.beatAtTime(p.time - run.origin));
      worst = Math.max(worst, Math.abs(p.time - (run.origin + fixtureTime(beat))));
    }
    expect(worst).toBeLessThan(1e-6); // dưới 1 micro giây sau 3 phút
  });

  it("tích/tắc xen kẽ và không beat nào phát hai lần", () => {
    const played = run.audio.plays.filter((p) => !p.cancelled);
    const beats = played.map((p) => Math.round(run.clock.tempo.beatAtTime(p.time - run.origin)));
    expect(new Set(beats).size).toBe(beats.length);
    played.forEach((p, i) => expect(p.kind).toBe((beats[i] as number) % 2 === 0 ? "tick" : "tock"));
  });

  it("khi treo, chỉ bỏ beat rơi vào lúc treo và không phát vào quá khứ", () => {
    const played = run.audio.plays.filter((p) => !p.cancelled);
    const beats = new Set(played.map((p) => Math.round(run.clock.tempo.beatAtTime(p.time - run.origin))));
    const missing: number[] = [];
    for (let beat = 0; beat <= Math.max(...beats); beat++) if (!beats.has(beat)) missing.push(beat);

    expect(missing.length).toBeGreaterThanOrEqual(1);
    for (const beat of missing) expect(inStall(run.origin + run.clock.tempo.timeAtBeat(beat))).toBe(true);
    for (const p of run.audio.plays) expect(p.time).toBeGreaterThanOrEqual(p.calledAt - 1e-9);
  });

  /**
   * Độ trễ của mỗi viên đạn so với lúc NGHE thấy tiếng của beat đó, đo bằng ĐỒNG HỒ ÂM THANH (không phải đồng hồ nhịp
   * của game, vì đồng hồ nhịp tự nhất quán nên không lộ ra sai lệch của chính nó). Bỏ qua các viên bị lỡ vì treo.
   */
  const heardLags = (): number[] =>
    run.spawns.filter((s) => !inStall(s.ctxTime)).map((s) => s.ctxTime - (run.origin + s.fireTime) - run.audio.latency);

  it("đạn không xuất hiện sớm hơn lúc nghe thấy tiếng của beat đó, và trễ không quá một khung hình", () => {
    const longestFrame = Math.max(...run.frames.filter((dt) => dt < 0.1));
    const lags = heardLags();
    expect(lags.length).toBeGreaterThan(150);
    expect(Math.min(...lags)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...lags)).toBeLessThanOrEqual(longestFrame + 1e-9);
  });

  it("không drift: độ trễ trung bình của đạn nửa đầu và nửa sau trận như nhau", () => {
    const lags = heardLags();
    const half = Math.floor(lags.length / 2);
    const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
    expect(Math.abs(mean(lags.slice(0, half)) - mean(lags.slice(half)))).toBeLessThan(0.004);
  });

  it("sau lúc treo đạn vẫn đúng giờ nghe thấy tiếng (đồng hồ nhịp không bị mất thời gian như bộ đếm tick)", () => {
    const longestFrame = Math.max(...run.frames.filter((dt) => dt < 0.1));
    const after = run.spawns.filter((s) => s.ctxTime >= START + STALL.at + STALL.length + 0.05);
    expect(after.length).toBeGreaterThan(50);
    for (const s of after) {
      const lag = s.ctxTime - (run.origin + s.fireTime) - run.audio.latency;
      expect(lag).toBeGreaterThanOrEqual(-1e-9);
      expect(lag).toBeLessThanOrEqual(longestFrame + 1e-9);
    }
  });

  it("đạn và tiếng cùng một thước đo: viên đạn ở beat B có giờ lý thuyết trùng giờ hẹn tiếng của beat B", () => {
    // Beat 2 của vòng đầu có một đạn thẳng (xem SYNC_FIXTURE).
    const bullet = run.spawns.find((s) => Math.abs(s.fireTime - fixtureTime(2)) < 1e-9);
    const tick = run.audio.plays.find((p) => !p.cancelled && Math.abs(p.time - (run.origin + fixtureTime(2))) < 1e-9);
    expect(bullet).toBeDefined();
    expect(tick).toBeDefined();
    expect((tick?.time ?? 0) - run.origin).toBeCloseTo(bullet?.fireTime ?? NaN, 9);
  });

  it("lặp ổn định: mỗi vòng sinh đúng cùng một số đạn", () => {
    const cycleBeats = SYNC_FIXTURE.lengthBeats;
    const perCycle = new Map<number, number>();
    for (const s of run.spawns) {
      const cycle = Math.floor(run.clock.tempo.beatAtTime(s.fireTime) / cycleBeats);
      perCycle.set(cycle, (perCycle.get(cycle) ?? 0) + 1);
    }
    const lastBeat = run.clock.tempo.beatAtTime(run.clock.time);
    const completeCycles = Math.floor(lastBeat / cycleBeats) - 1; // bỏ vòng cuối còn dang dở
    expect(completeCycles).toBeGreaterThanOrEqual(8);
    const counts = [...Array(completeCycles).keys()].map((c) => perCycle.get(c));
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeGreaterThan(20); // fixture có 23 viên mỗi vòng
  });

  it("cảnh báo kết thúc đúng lúc đạn xuất hiện và dài ít nhất telegraphMinSeconds", () => {
    // Chỉ xét cảnh báo đã đến hạn: cảnh báo vừa tạo ngay trước lúc mô phỏng kết thúc thì đạn của nó chưa kịp xuất hiện.
    const due = run.telegraphs.filter((t) => t.end <= run.clock.time);
    expect(due.length).toBeGreaterThan(50);
    const fireTimes = run.spawns.map((s) => s.fireTime);
    for (const t of due) {
      expect(t.end - t.start).toBeGreaterThanOrEqual(BULLET_FEEL.telegraphMinSeconds - 1e-9);
      expect(fireTimes.some((fireTime) => Math.abs(fireTime - t.end) < 1e-9)).toBe(true);
    }
  });

  it("pool đủ chỗ: không phải bỏ đạn nào", () => {
    expect(run.world.dropped).toBe(0);
  });
});
