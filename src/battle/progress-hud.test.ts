import { describe, expect, it } from "vitest";
import { GAME_HEIGHT, GAME_WIDTH } from "../core/config";
import { GUIDE_ZONE, HUD_COLOR, HUD_LAYOUT } from "../data/hud-feel";
import {
  drawBattleHud,
  drawStar,
  drawStarSummary,
  groupWidth,
  groupX,
  overlapsGuideZone,
  starWidth,
  type HudCanvas,
  type HudInfo,
} from "./progress-hud";

interface Box {
  kind: "rect" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label?: string;
}

/** Bản ghi mọi thứ HUD vẽ, với hộp bao của từng lệnh (chữ đo bằng 0,4 em mỗi ký tự như VT323). */
function recorder(): { canvas: HudCanvas; boxes: Box[] } {
  const boxes: Box[] = [];
  const measure = (text: string, size: number): number => text.length * size * 0.4;
  const canvas: HudCanvas = {
    rect(x, y, w, h, color) {
      boxes.push({ kind: "rect", x, y, w, h, color });
    },
    text(content, x, y, options = {}) {
      const size = options.size ?? 16;
      const w = measure(content, size);
      const left = options.align === "center" ? x - w / 2 : options.align === "right" ? x - w : x;
      boxes.push({ kind: "text", x: left, y, w, h: size, color: options.color ?? "#fff", label: content });
    },
    setAlpha() {},
    measureText: measure,
  };
  return { canvas, boxes };
}

const base: HudInfo = { round: 2, rounds: 3, stars: [3], progress: 0.5, hints: [], hintAlpha: 1 };

describe("progress-hud: bố cục", () => {
  it("không vẽ gì đè lên góc trên-trái (x < 120, y < 96) dành cho nhân vật hướng dẫn, ở mọi trạng thái", () => {
    const states: HudInfo[] = [
      base,
      { ...base, progress: 0 },
      { ...base, progress: 1, stars: [3, 2, 1] },
      { ...base, hints: ["Giữ Shift để đi chậm, né sát hơn. Hitbox nhỏ hơn hình bánh răng.", "Một dòng nữa"] },
      { ...base, banner: { round: 2, stars: 2, alpha: 1 } },
      { ...base, round: 1, stars: [] },
    ];
    for (const info of states) {
      const { canvas, boxes } = recorder();
      drawBattleHud(canvas, info);
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) {
        expect(overlapsGuideZone(box.x, box.y, box.w, box.h), `${box.kind} ${box.label ?? ""} ở ${box.x},${box.y}`).toBe(false);
      }
    }
    const summary = recorder();
    drawStarSummary(summary.canvas, [3, 2, 1]);
    for (const box of summary.boxes) expect(overlapsGuideZone(box.x, box.y, box.w, box.h)).toBe(false);
  });

  it("mọi thứ nằm trong màn 640×360", () => {
    const { canvas, boxes } = recorder();
    drawBattleHud(canvas, {
      ...base,
      hints: ["Chạm vào cây bút để cầm, rồi cứ đi là có nét. Tránh những thứ lấp lánh.", "Giữ Shift để đi chậm, né sát hơn. Hitbox nhỏ hơn hình bánh răng."],
    });
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(GAME_WIDTH);
      expect(box.y + box.h).toBeLessThanOrEqual(GAME_HEIGHT);
    }
  });

  it("vùng của nhân vật hướng dẫn đúng như đề: x < 120, y < 96", () => {
    expect(GUIDE_ZONE).toEqual({ x: 0, y: 0, w: 120, h: 96 });
    expect(overlapsGuideZone(119, 95, 5, 5)).toBe(true);
    expect(overlapsGuideZone(120, 0, 5, 5)).toBe(false);
    expect(overlapsGuideZone(0, 96, 5, 5)).toBe(false);
  });
});

describe("progress-hud: nội dung", () => {
  it("thanh tiến độ đầy theo tỉ lệ, đổi màu khi gần thắng", () => {
    const fillOf = (progress: number): { width: number; color: string } => {
      const { canvas, boxes } = recorder();
      drawBattleHud(canvas, { ...base, progress });
      const bar = HUD_LAYOUT.bar;
      const fill = boxes.find((b) => b.kind === "rect" && b.y === bar.y && b.h === bar.h && b.color !== HUD_COLOR.barBack);
      if (!fill) throw new Error("không thấy phần đầy của thanh");
      return { width: fill.w, color: fill.color };
    };
    expect(fillOf(0).width).toBe(0);
    expect(fillOf(0.5).width).toBe(HUD_LAYOUT.bar.w / 2);
    expect(fillOf(0.5).color).toBe(HUD_COLOR.barFill);
    expect(fillOf(0.9).color).toBe(HUD_COLOR.barNear);
    expect(fillOf(1).width).toBe(HUD_LAYOUT.bar.w);
    // Ngoài 0..1 thì kẹp lại.
    expect(fillOf(-1).width).toBe(0);
    expect(fillOf(7).width).toBe(HUD_LAYOUT.bar.w);
  });

  it("nhãn lượt, và đúng số ngôi sao sáng theo sao đã được của từng lượt", () => {
    const { canvas, boxes } = recorder();
    drawBattleHud(canvas, { ...base, round: 3, stars: [3, 1] });
    expect(boxes.some((b) => b.label === "Lượt 3/3")).toBe(true);
    // Mỗi ngôi sao vẽ bằng các hình chữ nhật cùng màu; đếm số ngôi sao sáng bằng số hình chữ nhật sáng / số hình chữ nhật mỗi sao.
    const probe = recorder();
    drawStar(probe.canvas, 0, 0, HUD_COLOR.star);
    const perStar = probe.boxes.length;
    const lit = boxes.filter((b) => b.kind === "rect" && b.color === HUD_COLOR.star).length;
    const dim = boxes.filter((b) => b.kind === "rect" && b.color === HUD_COLOR.starEmpty).length;
    expect(lit / perStar).toBe(3 + 1);
    expect(dim / perStar).toBe(9 - 4);
  });

  it("các nhóm sao căn phải tới mép phải thanh, không chồng nhau và không chạm nhãn", () => {
    const first = groupX(0, 3);
    const last = groupX(2, 3);
    expect(last + groupWidth(3)).toBe(HUD_LAYOUT.bar.x + HUD_LAYOUT.bar.w);
    expect(groupX(1, 3)).toBeGreaterThan(first + groupWidth(3));
    expect(first).toBeGreaterThan(HUD_LAYOUT.bar.x + 100);
    expect(starWidth()).toBe(14);
  });

  it("gợi ý hiện khi có, mỗi dòng một hàng dưới; bảng xong lượt thay chỗ gợi ý", () => {
    const withHints = recorder();
    drawBattleHud(withHints.canvas, { ...base, hints: ["một", "hai"] });
    const lines = withHints.boxes.filter((b) => b.kind === "text" && (b.label === "một" || b.label === "hai"));
    expect(lines.map((b) => b.label)).toEqual(["một", "hai"]);
    expect((lines[1] as Box).y).toBeGreaterThan((lines[0] as Box).y);
    expect((lines[0] as Box).y).toBe(HUD_LAYOUT.hintY);

    const none = recorder();
    drawBattleHud(none.canvas, { ...base, hints: [] });
    expect(none.boxes.some((b) => b.label === "một")).toBe(false);

    const banner = recorder();
    drawBattleHud(banner.canvas, { ...base, hints: ["một"], banner: { round: 2, stars: 3, alpha: 1 } });
    expect(banner.boxes.some((b) => b.label === "Xong lượt 2")).toBe(true);
    expect(banner.boxes.some((b) => b.label === "một")).toBe(false);
  });

  it("tổng kết sao cuối trận: không vẽ khi chưa có sao; có thì ghi tổng", () => {
    const empty = recorder();
    drawStarSummary(empty.canvas, []);
    expect(empty.boxes).toHaveLength(0);
    const full = recorder();
    drawStarSummary(full.canvas, [3, 2, 1]);
    expect(full.boxes.some((b) => b.label === "6/9 sao")).toBe(true);
  });
});
