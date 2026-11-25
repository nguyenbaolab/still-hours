import { describe, expect, it } from "vitest";
import { HUD_FEEL, HINTS } from "../data/hud-feel";
import { CLOCKWORK } from "../data/mechanisms/clockwork";
import type { Pattern } from "../data/pattern-types";
import { R4_ROUNDS } from "../data/patterns/resident-4";
import { BOSS_ROUNDS } from "../data/patterns/boss";
import { R2_ROUNDS } from "../data/patterns/resident-2";
import { R3_ROUNDS } from "../data/patterns/resident-3";
import { R1_ROUNDS } from "../data/patterns/resident-1";
import { DRAW_FEEL } from "../data/sketch-feel";
import {
  crossedMilestones,
  disassembleHint,
  disassembleProgress,
  dodgeHintKind,
  dodgeHints,
  dodgeProgress,
  isBlocked,
  ScoreBoard,
  soloContext,
  stageCounts,
  starsFor,
} from "./progress";

const length: Pattern = { name: "x", lengthBeats: 40, loop: false, finish: { kind: "length" }, events: [] };

describe("dodgeProgress", () => {
  it("length: beat / lengthBeats, kẹp trong 0..1, beat âm (dạo đầu) là 0", () => {
    expect(dodgeProgress(length, -3)).toBe(0);
    expect(dodgeProgress(length, 0)).toBe(0);
    expect(dodgeProgress(length, 10)).toBeCloseTo(0.25, 9);
    expect(dodgeProgress(length, 40)).toBe(1);
    expect(dodgeProgress(length, 99)).toBe(1);
  });

  it("page: lấy cái xa hơn giữa beat đã vẽ và đồng hồ tự khép trang", () => {
    const page = R4_ROUNDS[0];
    // Chưa vẽ gì, mới 16 beat: theo thời gian 16 / (3 × 32).
    expect(dodgeProgress(page, 16, 0)).toBeCloseTo(16 / (DRAW_FEEL.maxLoops * 32), 9);
    // Vẽ nửa trang: 16 / 32 = 0,5 vượt đồng hồ.
    expect(dodgeProgress(page, 16, 16)).toBeCloseTo(0.5, 9);
    expect(dodgeProgress(page, 5, 32)).toBe(1);
    expect(dodgeProgress(page, DRAW_FEEL.maxLoops * 32, 0)).toBe(1);
  });

  it("exit: số vòng (kể cả đã mang từ lần thua) trên số vòng mà khe mở hẳn", () => {
    const boss = BOSS_ROUNDS[0];
    const loops = boss.finish?.kind === "exit" ? boss.finish.widths.length : 0;
    expect(loops).toBe(3);
    expect(dodgeProgress(boss, 0, 0, 0)).toBe(0);
    expect(dodgeProgress(boss, 32, 0, 0)).toBeCloseTo(1 / 3, 9);
    // Thua rồi chơi lại: mang theo 2 vòng, beat 16 → (2 × 32 + 16) / 96.
    expect(dodgeProgress(boss, 16, 0, 2)).toBeCloseTo(80 / 96, 9);
    expect(dodgeProgress(boss, 0, 0, 3)).toBe(1);
  });

  it("pattern có độ dài 0 thì tiến độ 0, không chia cho 0", () => {
    expect(dodgeProgress({ ...length, lengthBeats: 0 }, 5)).toBe(0);
  });

  it("không bao giờ giảm khi beat tăng (mọi lượt thật, quét beat)", () => {
    const rounds = [...R1_ROUNDS, ...R2_ROUNDS, ...R3_ROUNDS, ...R4_ROUNDS, ...BOSS_ROUNDS];
    for (const pattern of rounds) {
      let last = 0;
      for (let beat = -2; beat <= 4 * pattern.lengthBeats; beat += 0.5) {
        const value = dodgeProgress(pattern, beat, Math.max(0, beat * 0.5));
        expect(value, pattern.name).toBeGreaterThanOrEqual(last - 1e-12);
        last = value;
      }
    }
  });
});

describe("starsFor: sao theo máu còn lại", () => {
  it("3 sao từ ngưỡng `three`, 2 sao từ `two`, còn lại 1; thắng luôn ít nhất 1", () => {
    expect(starsFor(20, 20)).toBe(3);
    expect(starsFor(15, 20)).toBe(3);
    expect(starsFor(14, 20)).toBe(2);
    expect(starsFor(8, 20)).toBe(2);
    expect(starsFor(7, 20)).toBe(1);
    expect(starsFor(1, 20)).toBe(1);
    // Máu tối đa khác 20 vẫn theo tỉ lệ.
    expect(starsFor(24, 32)).toBe(3);
    expect(starsFor(23, 32)).toBe(2);
    expect(starsFor(0, 32)).toBe(1);
  });

  it("máu tối đa không hợp lệ thì 1 sao", () => {
    expect(starsFor(5, 0)).toBe(1);
  });

  it("ngưỡng lấy từ HUD_FEEL: đổi ngưỡng thì kết quả đổi", () => {
    expect(starsFor(10, 20, { ...HUD_FEEL, stars: { three: 0.5, two: 0.25 } })).toBe(3);
  });
});

describe("crossedMilestones", () => {
  it("chỉ các mốc nằm trong (from, to]", () => {
    expect(crossedMilestones(0, 0.2)).toEqual([]);
    expect(crossedMilestones(0, 0.25)).toEqual([0.25]);
    expect(crossedMilestones(0.25, 0.5)).toEqual([0.5]);
    expect(crossedMilestones(0.2, 0.8)).toEqual([0.25, 0.5, 0.75]);
    expect(crossedMilestones(0.8, 1)).toEqual([]);
  });

  it("không báo lại mốc đã qua (from đã bằng mốc)", () => {
    expect(crossedMilestones(0.5, 0.5)).toEqual([]);
  });
});

describe("gợi ý pha né", () => {
  it("loại gợi ý theo pattern: không có cho bút, khe cửa, đứng yên, chữ, thường", () => {
    expect(dodgeHintKind(R4_ROUNDS[0])).toBeNull();
    expect(dodgeHintKind(BOSS_ROUNDS[0])).toBe("exit");
    expect(dodgeHintKind(R2_ROUNDS[0])).toBe("still");
    expect(dodgeHintKind(R3_ROUNDS[0])).toBe("word");
    expect(dodgeHintKind(R1_ROUNDS[0])).toBe("plain");
  });

  it("chưa thua đủ thì không có gợi ý; đủ thì một dòng riêng; thua nhiều thì thêm dòng chung", () => {
    const pattern = R1_ROUNDS[0];
    expect(dodgeHints(pattern, 0)).toEqual([]);
    expect(dodgeHints(pattern, HUD_FEEL.hintAfterLosses - 1)).toEqual([]);
    expect(dodgeHints(pattern, HUD_FEEL.hintAfterLosses)).toEqual([HINTS.dodge.plain]);
    expect(dodgeHints(pattern, HUD_FEEL.generalHintAfterLosses)).toEqual([HINTS.dodge.plain, HINTS.dodgeGeneral]);
    // Linh (pha có bút): không có gợi ý chữ nào, dù thua bao nhiêu lần.
    for (const losses of [0, 2, 4, 9]) for (const round of R4_ROUNDS) expect(dodgeHints(round, losses)).toEqual([]);
    expect(Object.keys(HINTS.dodge)).not.toContain("pencil");
  });

  it("mỗi dòng gợi ý đủ ngắn để vừa màn 640 ở cỡ 16 (VT323, advance 0,4 em)", () => {
    const all = [...Object.values(HINTS.dodge), HINTS.dodgeGeneral, ...Object.values(HINTS.disassemble)];
    for (const line of all) {
      expect(line.length, line).toBeGreaterThan(0);
      expect(line.length * 16 * 0.4, line).toBeLessThan(600);
    }
  });
});

describe("pha tháo: tiến độ và gợi ý", () => {
  it("stageCounts đếm đúng bộ phận từng tầng của CLOCKWORK", () => {
    const none = new Set<string>();
    const counts = [1, 2, 3].map((stage) => stageCounts(CLOCKWORK, none, stage).total);
    expect(counts).toEqual([4, 2, 4]);
    const ids = CLOCKWORK.parts.filter((p) => (p.stage ?? 1) === 1).map((p) => p.id);
    expect(stageCounts(CLOCKWORK, new Set(ids.slice(0, 3)), 1)).toEqual({ total: 4, done: 3 });
  });

  it("disassembleProgress: (đã tháo + phần lẻ) / tổng, kẹp trong 0..1; tầng rỗng coi là xong", () => {
    expect(disassembleProgress(4, 0)).toBe(0);
    expect(disassembleProgress(4, 2)).toBe(0.5);
    expect(disassembleProgress(4, 2, 0.5)).toBeCloseTo(0.625, 9);
    expect(disassembleProgress(4, 4, 0.9)).toBe(1);
    expect(disassembleProgress(4, 1, -1)).toBe(0.25);
    expect(disassembleProgress(0, 0)).toBe(1);
  });

  it("disassembleHint theo bộ phận đang chọn: bị chặn, vặn ốc, nhấc, gỡ; nhịp hay không nhịp; không chọn gì", () => {
    const screw = CLOCKWORK.parts.find((p) => p.operation === "unscrew" && p.blockedBy.length === 0);
    const lift = CLOCKWORK.parts.find((p) => p.operation === "lift");
    const hook = CLOCKWORK.parts.find((p) => p.operation === "unhook");
    const blocked = CLOCKWORK.parts.find((p) => p.blockedBy.length > 0);
    if (!screw || !lift || !hook || !blocked) throw new Error("CLOCKWORK thiếu bộ phận thử");
    const none = new Set<string>();
    expect(isBlocked(blocked, none)).toBe(true);
    expect(isBlocked(blocked, new Set(blocked.blockedBy))).toBe(false);
    expect(disassembleHint(blocked, none, true)).toBe(HINTS.disassemble.blocked);
    expect(disassembleHint(screw, none, true)).toBe(HINTS.disassemble.unscrewRhythmic);
    expect(disassembleHint(screw, none, false)).toBe(HINTS.disassemble.unscrew);
    expect(disassembleHint(hook, new Set(hook.blockedBy), true)).toBe(HINTS.disassemble.unhookRhythmic);
    expect(disassembleHint(hook, new Set(hook.blockedBy), false)).toBe(HINTS.disassemble.unhook);
    expect(disassembleHint(lift, new Set(lift.blockedBy), true)).toBe(HINTS.disassemble.lift);
    expect(disassembleHint(undefined, none, true)).toBe(HINTS.disassemble.move);
  });
});

describe("ScoreBoard và soloContext", () => {
  it("ScoreBoard cộng dồn", () => {
    const board = new ScoreBoard();
    expect(board.add(5)).toBe(5);
    expect(board.add(10)).toBe(15);
    expect(board.total).toBe(15);
  });

  it("soloContext: không cư dân, lượt 1, ghi đè được từng trường", () => {
    const solo = soloContext({ round: 2, losses: 3 });
    expect(solo.resident).toBeNull();
    expect(solo.round).toBe(2);
    expect(solo.losses).toBe(3);
    expect(solo.rounds).toBe(3);
    expect(solo.score.total).toBe(0);
  });
});
