import { describe, expect, it } from "vitest";
import { canvasCssSize, pixelArtScale } from "./renderer";

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

  it("khung dọc co vừa khít chiều hẹp, không làm tròn xuống thành ô nhỏ", () => {
    // Điện thoại 390×624 css, dpr 3: chiều hẹp là bề ngang. Hệ số nguyên sẽ ra 213 px, còn thiếu một phần ba màn.
    const size = canvasCssSize(390, 624, 3);
    expect(size.width).toBeCloseTo(390, 5);
    expect(size.height).toBeCloseTo(390 * (360 / 640), 5);
    expect(size.scale).toBeGreaterThan(1);
  });
});
