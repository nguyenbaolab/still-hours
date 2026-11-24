import { describe, expect, it } from "vitest";
import { greyOf, greyscaleSprite } from "./sprites";

describe("sprite xám", () => {
  it("màu thành xám cùng độ sáng; màu lạ giữ nguyên", () => {
    expect(greyOf("#ffffff")).toBe("#ffffff");
    expect(greyOf("#000000")).toBe("#000000");
    const grey = greyOf("#e0b04a");
    expect(grey).toMatch(/^#([0-9a-f]{2})\1\1$/);
    expect(greyOf("transparent")).toBe("transparent");
  });

  it("giữ nguyên hình và scale, chỉ đổi bảng màu", () => {
    const data = { scale: 2, palette: { a: "#ff0000", b: "#00ff00" }, rows: ["ab", "ba"] };
    const out = greyscaleSprite(data);
    expect(out.rows).toEqual(data.rows);
    expect(out.scale).toBe(2);
    expect(out.palette.a).toBe(greyOf("#ff0000"));
    expect(out.palette.a).not.toBe("#ff0000");
    expect(greyscaleSprite({ palette: {}, rows: ["."] }).scale).toBeUndefined();
  });
});
