import { describe, expect, it } from "vitest";
import { PLAYER_FEEL } from "../data/feel";
import { RESIDENTS } from "../data/residents";
import { BULLET_FEEL } from "../data/rhythm-feel";
import { humanLosses, hitsToLose, threat } from "./difficulty";

/**
 * Độ khó tăng dần từ cư dân 1 tới boss (nhiệm vụ gameplay-balance-v2). Bảng trước/sau đầy đủ ở docs/balance.md.
 * Các số "người chơi" ở đây là bot né đạn có phản xạ chậm, không phải người thật: chỉ để bắt trường hợp cư dân 1 lại khó.
 */

/** Phản xạ của bot "lơ đãng": quyết định mỗi ~0,67 giây (`reactionTicks` 20 = 0,33 s, bot quyết định cách một lần gọi). */
const INATTENTIVE_TICKS = 20;

const maxHpOf = (resident: (typeof RESIDENTS)[number]): number => resident.hp ?? PLAYER_FEEL.maxHp;

/** Đạn trừ máu mỗi giây của lượt, chia số lần trúng chịu được: mức "áp lực" của một lượt. */
function load(resident: (typeof RESIDENTS)[number], round: number): number {
  const pattern = resident.rounds[round];
  if (!pattern) throw new Error("thiếu lượt");
  return threat(pattern).perSecond / hitsToLose(maxHpOf(resident), BULLET_FEEL.damage);
}

describe("độ khó tăng dần", () => {
  it("máu tối đa giảm dần theo thứ tự gặp: cư dân đầu nhiều nhất, boss ít nhất (bằng mức cũ 20)", () => {
    const hp = RESIDENTS.map(maxHpOf);
    for (let i = 1; i < hp.length; i++) expect(hp[i], RESIDENTS[i]?.id).toBeLessThan(hp[i - 1] as number);
    expect(hp[0]).toBeGreaterThanOrEqual(32);
    expect(hp.at(-1)).toBe(PLAYER_FEEL.maxHp);
  });

  it("máu là bội số sát thương mặc định (không có lần trúng 'dở dang')", () => {
    for (const resident of RESIDENTS) expect(maxHpOf(resident) % BULLET_FEEL.damage, resident.id).toBe(0);
  });

  it("áp lực (đạn mỗi giây / số lần trúng chịu được) tăng dần qua cư dân 1, 2, 4, boss", () => {
    const [first, second, , fourth, boss] = RESIDENTS;
    if (!first || !second || !fourth || !boss) throw new Error("thiếu cư dân");
    const mean = (r: (typeof RESIDENTS)[number]): number => ([0, 1, 2] as const).reduce<number>((sum, i) => sum + load(r, i), 0) / 3;
    // Cư dân 3 khó ở chỗ khác (chữ làm chậm nhịp, đạn thưa), nên chỉ so cư dân đạn thuần với nhau.
    expect(mean(first)).toBe(Math.min(...[first, second, fourth, boss].map(mean)));
    // Cư dân đạn thuần (1, 2, 4, boss) tăng dần theo thứ tự gặp.
    expect(mean(first)).toBeLessThan(mean(second));
    expect(mean(second)).toBeLessThan(mean(fourth));
    expect(mean(fourth)).toBeLessThan(mean(boss));
    // Trong cư dân 1, lượt sau không dễ hơn lượt trước.
    expect(load(first, 0)).toBeLessThanOrEqual(load(first, 1));
    expect(load(first, 1)).toBeLessThanOrEqual(load(first, 2));
  });

  it("cư dân 1: bot lơ đãng (quyết định mỗi ~0,67 giây) thắng mọi lượt, nhiều nhất thua một lần, ở ba hạt giống khác nhau", () => {
    const first = RESIDENTS[0];
    if (!first) throw new Error("thiếu cư dân 1");
    for (const [index, pattern] of first.rounds.entries()) {
      for (const seed of [1, 2, 3]) {
        const result = humanLosses(pattern, maxHpOf(first), INATTENTIVE_TICKS, 6, seed);
        expect(result.won, `lượt ${index + 1} hạt giống ${seed}`).toBe(true);
        expect(result.losses, `lượt ${index + 1} hạt giống ${seed}`).toBeLessThanOrEqual(1);
      }
    }
  }, 60_000);

  it("in bảng áp lực của mọi lượt (không kiểm số)", () => {
    const lines = RESIDENTS.flatMap((resident) =>
      resident.rounds.map((pattern, i) => {
        const t = threat(pattern);
        return `${resident.id}.${i + 1} máu ${maxHpOf(resident)} (${hitsToLose(maxHpOf(resident))} lần trúng) BPM ${t.bpmStart.toFixed(0)}→${t.bpmEnd.toFixed(0)} ${t.seconds.toFixed(1)} s ${t.bullets} đạn ${t.perSecond.toFixed(2)}/s đỉnh4s ${t.peakPerWindow} áp lực ${load(resident, i).toFixed(3)}`;
      }),
    );
    console.info(`\n${lines.join("\n")}`);
    expect(lines).toHaveLength(RESIDENTS.length * 3);
  });
});
