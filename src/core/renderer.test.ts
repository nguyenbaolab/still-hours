import { describe, expect, it } from "vitest";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { DISASSEMBLY_LAYOUT } from "../data/disassembly-feel";
import { DIALOGUE_FEEL } from "../data/flow-feel";
import { LAG_CLOCK_FEEL } from "../data/rhythm-feel";
import { DRAW_FEEL } from "../data/sketch-feel";
import { GAME_HEIGHT, GAME_WIDTH, GUIDE_SLOT } from "./config";
import { canvasCssSize, guideSlotCss, pixelArtScale } from "./renderer";

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe("pixelArtScale", () => {
  it.each([
    [1280, 720, 2],
    [1920, 1080, 3],
    [2560, 1440, 4],
    [3840, 2160, 6],
  ])("cửa sổ %d×%d pixel thiết bị → hệ số %d", (width, height, scale) => {
    expect(pixelArtScale(width, height)).toBe(scale);
  });

  it("đúng bằng độ phân giải logic thì hệ số 1", () => {
    expect(pixelArtScale(640, 360)).toBe(1);
  });

  it("cửa sổ nhỏ hơn độ phân giải logic thì thu nhỏ lẻ", () => {
    expect(pixelArtScale(320, 180)).toBe(0.5);
  });

  it("chưa đủ bội số tiếp theo thì giữ bội số thấp hơn", () => {
    expect(pixelArtScale(1919, 1079)).toBe(2);
  });
});

describe("canvasCssSize", () => {
  it("khung ngang giữ hệ số nguyên", () => {
    expect(canvasCssSize(1920, 1080, 1)).toEqual({ scale: 3, width: 1920, height: 1080 });
    expect(canvasCssSize(1919, 1079, 1).scale).toBe(2);
  });

  it("GUIDE_SLOT là 76×76 ở góc trên-trái và không đè HUD", () => {
    expect(GUIDE_SLOT).toEqual({ x: 0, y: 0, w: 76, h: 76 });
    expect(GUIDE_SLOT.x + GUIDE_SLOT.w).toBeLessThanOrEqual(GAME_WIDTH);
    expect(GUIDE_SLOT.y + GUIDE_SLOT.h).toBeLessThanOrEqual(GAME_HEIGHT);

    const { arena, borderThickness, hpBar } = BATTLE_LAYOUT;
    const frame = {
      x: arena.x - borderThickness,
      y: arena.y - borderThickness,
      w: arena.w + borderThickness * 2,
      h: arena.h + borderThickness * 2,
    };
    const hp = {
      x: arena.x,
      y: arena.y + arena.h + borderThickness + hpBar.gapBelowFrame,
      w: arena.w,
      h: hpBar.height,
    };
    const { box, lineHeight } = DIALOGUE_FEEL;
    const dialogue = { x: box.x, y: box.y - lineHeight, w: box.w, h: box.h + lineHeight };
    const memory = { x: 0, y: DISASSEMBLY_LAYOUT.memoryY, w: GAME_WIDTH, h: 24 };
    const bench = DISASSEMBLY_LAYOUT.bench;
    const benchFrame = { x: bench.x - 4, y: bench.y - 4, w: bench.w + 8, h: bench.h + 8 };
    const clockAt = (radius: number) => {
      const cx = arena.x + arena.w - radius;
      const cy = arena.y - borderThickness - radius - 6;
      const reach = radius + 2;
      return { x: cx - reach, y: cy - reach, w: reach * 2, h: reach * 2 };
    };

    expect(overlaps(GUIDE_SLOT, frame)).toBe(false);
    expect(overlaps(GUIDE_SLOT, hp)).toBe(false);
    expect(overlaps(GUIDE_SLOT, DISASSEMBLY_LAYOUT.bench)).toBe(false);
    expect(overlaps(GUIDE_SLOT, benchFrame)).toBe(false);
    expect(overlaps(GUIDE_SLOT, dialogue)).toBe(false);
    expect(overlaps(GUIDE_SLOT, memory)).toBe(false);
    expect(overlaps(GUIDE_SLOT, clockAt(LAG_CLOCK_FEEL.radius))).toBe(false);
    expect(overlaps(GUIDE_SLOT, clockAt(DRAW_FEEL.clockRadius))).toBe(false);
    expect(frame).toEqual({ x: 116, y: 96, w: 408, h: 168 });
  });

  it("ở bốn kích thước, hộp CSS của guide-slot quy về đúng GUIDE_SLOT", () => {
    const viewports = [
      [375, 667],
      [768, 1024],
      [1280, 720],
      [1920, 1080],
    ] as const;
    for (const dpr of [1, 2, 3]) {
      for (const [boxW, boxH] of viewports) {
        const size = canvasCssSize(boxW, boxH, dpr);
        expect(size.width).toBeGreaterThan(0);
        const canvasLeft = (boxW - size.width) / 2;
        const canvasTop = (boxH - size.height) / 2;
        const css = guideSlotCss(canvasLeft, canvasTop, size.width, size.height);
        const sx = size.width / GAME_WIDTH;
        const sy = size.height / GAME_HEIGHT;
        expect((css.left - canvasLeft) / sx).toBeCloseTo(GUIDE_SLOT.x, 5);
        expect((css.top - canvasTop) / sy).toBeCloseTo(GUIDE_SLOT.y, 5);
        expect(css.width / sx).toBeCloseTo(GUIDE_SLOT.w, 5);
        expect(css.height / sy).toBeCloseTo(GUIDE_SLOT.h, 5);
      }
    }
  });

  it("khung dọc co vừa khít chiều hẹp, không làm tròn xuống thành ô nhỏ", () => {
    // Điện thoại 390×624 css, dpr 3: chiều hẹp là bề ngang. Hệ số nguyên sẽ ra 213 px, còn thiếu một phần ba màn.
    const size = canvasCssSize(390, 624, 3);
    expect(size.width).toBeCloseTo(390, 5);
    expect(size.height).toBeCloseTo(390 * (360 / 640), 5);
    expect(size.scale).toBeGreaterThan(1);
  });
});
