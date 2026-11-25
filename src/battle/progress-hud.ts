/**
 * Vẽ tiến độ, sao và gợi ý của trận (chỉ vẽ: không đổi trạng thái game, không phát sự kiện). Dùng chung cho pha né và pha
 * tháo; `BattleScene` cấp `HudInfo` qua các pha, hai pha chỉ gọi `drawBattleHud` ở cuối `render`.
 *
 * Bố cục (pixel logic 640×360): hàng trên cùng, từ x = 120: nhãn "Lượt n/3" bên trái, ba nhóm sao (mỗi lượt một nhóm) bên phải
 * cho tới x = 520, thanh tiến độ ngay dưới. Gợi ý ở dưới màn. Góc trên trái (x < 120, y < 96) dành cho nhân vật hướng dẫn nên
 * không có gì ở đó (`GUIDE_ZONE`, kiểm bằng test).
 */

import type { Renderer } from "../core/renderer";
import { GUIDE_ZONE, HUD_COLOR, HUD_FEEL, HUD_LAYOUT } from "../data/hud-feel";

/** Phần của `Renderer` mà HUD dùng; test thay bằng bản ghi. */
export type HudCanvas = Pick<Renderer, "rect" | "text" | "setAlpha" | "measureText">;

export interface HudInfo {
  /** Lượt hiện tại (1..rounds). */
  round: number;
  rounds: number;
  /** Sao đã được của các lượt trước (0 = chưa chơi tới). Độ dài ≤ rounds. */
  stars: readonly number[];
  /** Tiến độ của pha hiện tại, 0..1. */
  progress: number;
  /** Gợi ý đang hiện (rỗng = không có) và độ đậm 0..1. */
  hints: readonly string[];
  hintAlpha: number;
  /** Bảng "xong lượt" hiện trong vài giây đầu của pha tháo sau khi thắng pha né. */
  banner?: { round: number; stars: number; alpha: number } | undefined;
}

/** Ngôi sao 7×7 điểm ảnh. */
const STAR = [
  "...#...",
  "...#...",
  "#######",
  ".#####.",
  "..###..",
  ".##.##.",
  "##...##",
] as const;

/** Bề ngang một ngôi sao (px). */
export function starWidth(): number {
  return STAR[0].length * HUD_LAYOUT.starPixel;
}

/** Bề ngang một nhóm `count` sao. */
export function groupWidth(count: number): number {
  return count * starWidth() + (count - 1) * HUD_LAYOUT.starGap;
}

/** Vẽ một ngôi sao, góc trên trái ở (x, y). */
export function drawStar(canvas: HudCanvas, x: number, y: number, color: string): void {
  const px = HUD_LAYOUT.starPixel;
  STAR.forEach((row, r) => {
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const on = c < row.length && row[c] === "#";
      if (on && start < 0) start = c;
      if (!on && start >= 0) {
        canvas.rect(x + start * px, y + r * px, (c - start) * px, px, color);
        start = -1;
      }
    }
  });
}

/** Một nhóm 3 sao, `filled` sao đầu sáng, còn lại mờ. */
export function drawStarGroup(canvas: HudCanvas, x: number, y: number, filled: number): void {
  for (let i = 0; i < 3; i++) {
    drawStar(canvas, x + i * (starWidth() + HUD_LAYOUT.starGap), y, i < filled ? HUD_COLOR.star : HUD_COLOR.starEmpty);
  }
}

/** Vị trí x của nhóm sao của lượt `index` (0-based) trong `rounds` lượt, căn phải tới mép phải thanh. */
export function groupX(index: number, rounds: number): number {
  const width = groupWidth(3);
  const right = HUD_LAYOUT.bar.x + HUD_LAYOUT.bar.w;
  return right - (rounds - index) * width - (rounds - 1 - index) * HUD_LAYOUT.groupGap;
}

export function drawBattleHud(canvas: HudCanvas, info: HudInfo): void {
  const { bar } = HUD_LAYOUT;
  canvas.setAlpha(1);

  // Nhãn và sao các lượt.
  canvas.text(`Lượt ${info.round}/${info.rounds}`, bar.x, HUD_LAYOUT.labelY, { size: 16, color: HUD_COLOR.label });
  for (let i = 0; i < info.rounds; i++) {
    drawStarGroup(canvas, groupX(i, info.rounds), HUD_LAYOUT.labelY + 1, info.stars[i] ?? 0);
  }

  // Thanh tiến độ, và vạch ở các mốc.
  const progress = Math.min(1, Math.max(0, info.progress));
  canvas.rect(bar.x, bar.y, bar.w, bar.h, HUD_COLOR.barBack);
  canvas.rect(bar.x, bar.y, Math.round(bar.w * progress), bar.h, progress >= HUD_FEEL.nearWinFraction ? HUD_COLOR.barNear : HUD_COLOR.barFill);
  for (const mark of HUD_FEEL.milestones) {
    canvas.rect(bar.x + Math.round(bar.w * mark) - 1, bar.y - 2, 2, bar.h + 4, HUD_COLOR.label);
  }

  if (info.banner && info.banner.alpha > 0) drawBanner(canvas, info.banner);
  else if (info.hints.length > 0 && info.hintAlpha > 0) drawHints(canvas, info.hints, info.hintAlpha);
  canvas.setAlpha(1);
}

function drawHints(canvas: HudCanvas, hints: readonly string[], alpha: number): void {
  hints.forEach((line, i) => {
    canvas.text(line, 320, HUD_LAYOUT.hintY + i * 18, { size: 16, color: HUD_COLOR.hint, align: "center", alpha });
  });
}

function drawBanner(canvas: HudCanvas, banner: { round: number; stars: number; alpha: number }): void {
  const text = `Xong lượt ${banner.round}`;
  const gap = 10;
  const starsW = groupWidth(3);
  const textW = canvas.measureText(text, 16);
  const left = Math.round(320 - (textW + gap + starsW) / 2);
  canvas.setAlpha(banner.alpha);
  canvas.text(text, left, HUD_LAYOUT.hintY, { size: 16, color: HUD_COLOR.hint });
  drawStarGroup(canvas, left + textW + gap, HUD_LAYOUT.hintY + 1, banner.stars);
  canvas.setAlpha(1);
}

/**
 * Tổng kết sao khi xong trận (hội thoại khép trận, nền tối): ba nhóm sao của ba lượt ở giữa, dòng "n/9 sao" ngay dưới.
 * Không có gì để vẽ khi chưa lượt nào có sao (nhảy cóc thẳng vào trận).
 */
export function drawStarSummary(canvas: HudCanvas, stars: readonly number[], rounds = 3): void {
  if (stars.length === 0) return;
  const groupW = groupWidth(3);
  const total = rounds * groupW + (rounds - 1) * HUD_LAYOUT.groupGap;
  const y = 110;
  const left = Math.round(320 - total / 2);
  canvas.setAlpha(1);
  for (let i = 0; i < rounds; i++) drawStarGroup(canvas, left + i * (groupW + HUD_LAYOUT.groupGap), y, stars[i] ?? 0);
  const sum = stars.reduce((acc, value) => acc + value, 0);
  canvas.text(`${sum}/${rounds * 3} sao`, 320, y + 7 * HUD_LAYOUT.starPixel + 8, { size: 16, color: HUD_COLOR.hint, align: "center" });
}

/** Hình chữ nhật có chồng lên vùng của nhân vật hướng dẫn không (để test). */
export function overlapsGuideZone(x: number, y: number, w: number, h: number): boolean {
  return x < GUIDE_ZONE.x + GUIDE_ZONE.w && x + w > GUIDE_ZONE.x && y < GUIDE_ZONE.y + GUIDE_ZONE.h && y + h > GUIDE_ZONE.y;
}
