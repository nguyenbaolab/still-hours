import { describe, expect, it } from "vitest";
import { pixelArtScale } from "./renderer";

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
