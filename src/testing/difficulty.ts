/**
 * Đo độ khó của một lượt né bằng số (không vào bản build). Hai cách, bổ sung cho nhau:
 *  - `threat`: đếm đạn trừ máu mỗi giây kịch bản của pattern (phân tích tĩnh từ dữ liệu);
 *  - `humanLosses`: chạy `DodgePhase` thật với `DodgerBot` nhưng bot chỉ được ra quyết định thưa (phản xạ chậm), để gần người
 *    hơn bot hoàn hảo (bot hoàn hảo thắng mọi lượt, nên không đo được "khó").
 * Con số của bot vẫn chỉ là cận dưới của người thật: nó tính quỹ đạo đạn chính xác.
 */
import { DodgePhase } from "../battle/dodge-phase";
import { soloContext } from "../battle/progress";
import { Input } from "../core/input";
import { TempoMap } from "../core/tempo-map";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import type { Pattern } from "../data/pattern-types";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { DodgerBot } from "./dodger";
import { steer } from "./bots";
import { FakeAudio, lcg, simulate } from "./sim";

/** Thời gian kịch bản (giây) của `beats` beat đầu của lượt. */
export function scriptSeconds(pattern: Pattern, beats: number): number {
  const tempo = new TempoMap(pattern.bpm ?? 100);
  for (const event of pattern.events) if (event.type === "tempo") tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  return tempo.scriptTimeAtBeat(beats);
}

/** Số beat mà lượt kéo dài khi tính độ khó: `length` thì cả lượt; `page` / `exit` (có lặp) thì một vòng pattern. */
export function roundBeats(pattern: Pattern): number {
  return pattern.lengthBeats;
}

export interface Threat {
  /** Tổng số viên đạn trừ máu của lượt (một vòng với pattern lặp). */
  bullets: number;
  seconds: number;
  /** Số viên mỗi giây kịch bản, trung bình. */
  perSecond: number;
  /** Nhiều nhất trong một cửa sổ trượt 4 giây. */
  peakPerWindow: number;
  bpmStart: number;
  bpmEnd: number;
}

/** Số viên đạn trừ máu mà một sự kiện sinh ra (chữ và xao nhãng không trừ máu: 0). Kim đồng hồ tính 3 vì quét cả vùng. */
function bulletsOf(event: Pattern["events"][number]): number {
  switch (event.type) {
    case "straight":
    case "aimed":
      return event.count ?? 1;
    case "burst":
      return event.count;
    case "sweep":
      return 3 * (event.hands ?? 1);
    default:
      return 0;
  }
}

export function threat(pattern: Pattern): Threat {
  const beats = roundBeats(pattern);
  const tempo = new TempoMap(pattern.bpm ?? 100);
  for (const event of pattern.events) if (event.type === "tempo") tempo.change(event.beat, event.bpm, event.overBeats ?? 0);
  const seconds = tempo.scriptTimeAtBeat(beats);
  const at = pattern.events
    .map((event) => ({ time: tempo.scriptTimeAtBeat(event.beat), count: bulletsOf(event) }))
    .filter((item) => item.count > 0);
  const bullets = at.reduce((sum, item) => sum + item.count, 0);
  let peak = 0;
  for (const start of at) {
    const inWindow = at.filter((item) => item.time >= start.time && item.time < start.time + 4).reduce((sum, item) => sum + item.count, 0);
    peak = Math.max(peak, inWindow);
  }
  return {
    bullets,
    seconds,
    perSecond: bullets / seconds,
    peakPerWindow: peak,
    bpmStart: tempo.bpmAtBeat(0),
    bpmEnd: tempo.bpmAtBeat(beats),
  };
}

/** Số lần trúng đạn mà người chơi chịu được trước khi thua, với máu tối đa `maxHp` và sát thương mặc định. */
export function hitsToLose(maxHp: number = PLAYER_FEEL.maxHp, damage: number = BULLET_FEEL.damage): number {
  return Math.ceil(maxHp / damage);
}

/**
 * Người chơi KÉM: ngoài phản xạ chậm (`reactionTicks`), mỗi lần bot ra quyết định có xác suất `errorRate` làm sai: bấm một hướng
 * ngẫu nhiên (hoặc đứng yên) thay cho hướng bot chọn, giữ tới lần quyết định sau. Cảm giác của người chơi (`player`) là của cư dân.
 */
export interface PoorOptions {
  errorRate?: number;
  player?: Partial<typeof PLAYER_FEEL>;
}

export interface HumanResult {
  won: boolean;
  losses: number;
  /** Máu còn lại lúc thắng (lần thắng), hoặc 0. */
  hp: number;
  hitsTaken: number;
}

/**
 * Chạy một lượt né thật với bot phản xạ chậm: bot chỉ được hành động mỗi `reactionTicks` tick (trong lúc đó giữ nguyên phím).
 * Chỉ dùng cho lượt không cần hành vi riêng (không `pencil`, không `exit`): các lượt đó cần mục tiêu, xem `playthrough.test.ts`.
 */
export function humanLosses(
  pattern: Pattern,
  maxHp: number,
  reactionTicks: number,
  maxAttempts = 8,
  seed = 1,
  options: PoorOptions = {},
): HumanResult {
  const { arena } = BATTLE_LAYOUT;
  let losses = 0;
  let hitsTaken = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const audio = new FakeAudio(5, 0.03);
    const input = new Input();
    const phase = new DodgePhase(input, audio, 18, pattern, { context: soloContext({ maxHp, ...(options.player ? { player: options.player } : {}) }) });
    const player = phase["player"];
    const world = phase["world"];
    const clock = phase["clock"];
    const bot = new DodgerBot(input);
    const random = lcg(seed * 7919 + attempt);
    const hitHalf = (options.player?.hitboxSize ?? PLAYER_FEEL.hitboxSize) / 2;
    let tick = 0;
    let lastHp = maxHp;
    simulate({
      seconds: 5 + 150,
      audio,
      step: () => {
        if (tick++ % reactionTicks === 0) {
          const beatsPerSecond = clock.tempo.bpmAtBeat(Math.max(0, clock.beat)) / 60;
          bot.act(player, world, { arena, beatsPerSecond, hitHalf, speed: PLAYER_FEEL.speed });
          if (options.errorRate && random() < options.errorRate) {
            const angle = Math.floor(random() * 9) * (Math.PI / 4);
            // 9 lựa chọn: 8 hướng, hoặc đứng yên.
            if (angle >= 2 * Math.PI) steer(input, 0, 0);
            else steer(input, Math.cos(angle), Math.sin(angle), 0.3);
          }
        }
        input.poll();
        phase.update();
        if (phase.hp < lastHp) {
          hitsTaken++;
          lastHp = phase.hp;
        }
      },
      seed,
      stopWhen: () => phase.outcome !== "playing",
    });
    if (phase.outcome === "won") return { won: true, losses, hp: phase.hp, hitsTaken };
    losses++;
  }
  return { won: false, losses, hp: 0, hitsTaken };
}

export interface Trials {
  /** Số lần thử mà cả ba lượt đều thắng ngay lần đầu, không thua lần nào. */
  wins: number;
  trials: number;
  /** Tổng số lần trúng đạn trung bình mỗi lần thử (cả ba lượt). */
  meanHits: number;
}

/**
 * Một người chơi mới chơi cư dân với `rounds` ba lượt: mỗi lần thử là ba lượt liên tiếp, mỗi lượt chỉ được chơi MỘT lần
 * (thua là hỏng lần thử). Dùng để kiểm "người kém thắng ngay lần đầu".
 */
export function firstTryTrials(
  rounds: readonly Pattern[],
  maxHp: number,
  reactionTicks: number,
  errorRate: number,
  trials: number,
  player?: Partial<typeof PLAYER_FEEL>,
): Trials {
  let wins = 0;
  let hits = 0;
  for (let seed = 1; seed <= trials; seed++) {
    let ok = true;
    for (const [index, pattern] of rounds.entries()) {
      const result = humanLosses(pattern, maxHp, reactionTicks, 1, seed * 31 + index, { errorRate, ...(player ? { player } : {}) });
      hits += result.hitsTaken;
      if (!result.won) ok = false;
    }
    if (ok) wins++;
  }
  return { wins, trials, meanHits: hits / trials };
}
