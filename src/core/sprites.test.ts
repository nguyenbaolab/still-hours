import { describe, expect, it } from "vitest";
import { frameIndex, greyOf, greyscaleSprite, SpriteStore, stillSprite } from "./sprites";

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

  it("giữ khung hình, số bước và lệch pha", () => {
    const blink = ["..", ".."];
    const data = {
      scale: 2,
      palette: { a: "#ff0000" },
      rows: ["a.", ".a"],
      frames: [blink],
      holds: [4, 1],
      frameSeconds: 0.2,
      phaseSeconds: 0.4,
    };
    const out = greyscaleSprite(data);
    expect(out.frames).toEqual([blink]);
    expect(out.holds).toEqual([4, 1]);
    expect(out.frameSeconds).toBe(0.2);
    expect(out.phaseSeconds).toBe(0.4);
    expect(out.rows).toBe(data.rows);
  });
});

describe("khung hình theo thời gian", () => {
  it("một khung thì luôn là khung 0", () => {
    expect(frameIndex(10, 1, 0.2)).toBe(0);
  });

  it("chia đều khi không khai số bước", () => {
    expect(frameIndex(0, 2, 0.5)).toBe(0);
    expect(frameIndex(0.49, 2, 0.5)).toBe(0);
    expect(frameIndex(0.5, 2, 0.5)).toBe(1);
    expect(frameIndex(1, 2, 0.5)).toBe(0);
  });

  it("holds giữ khung mở lâu và nháy ngắn", () => {
    expect(frameIndex(0, 2, 0.1, [8, 1])).toBe(0);
    expect(frameIndex(0.79, 2, 0.1, [8, 1])).toBe(0);
    expect(frameIndex(0.8, 2, 0.1, [8, 1])).toBe(1);
    expect(frameIndex(0.9, 2, 0.1, [8, 1])).toBe(0);
  });

  it("thời gian âm thì quay vòng", () => {
    expect(frameIndex(-0.1, 2, 0.5)).toBe(1);
  });
});

describe("sprite đứng yên", () => {
  it("bỏ khung hình, giữ hình và scale", () => {
    const data = { scale: 3, palette: { a: "#ffffff" }, rows: ["a"], frames: [["."]], holds: [2, 1], frameSeconds: 0.2, phaseSeconds: 1 };
    const out = stillSprite(data);
    expect(out).toEqual({ scale: 3, palette: data.palette, rows: ["a"] });
    expect(stillSprite({ palette: {}, rows: ["."] })).toEqual({ palette: {}, rows: ["."] });
  });
});

describe("SpriteStore", () => {
  const previous = globalThis.document;

  function installDocument(): void {
    const fake = {
      createElement() {
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              fillStyle: "",
              fillRect() {},
            };
          },
        };
      },
    };
    globalThis.document = fake as unknown as Document;
  }

  it("get trả khung theo đồng hồ; kích thước lấy từ khung đầu", () => {
    installDocument();
    try {
      let time = 0;
      const store = new SpriteStore(() => time);
      store.definePixels("dot", {
        scale: 2,
        palette: { r: "#ff0000" },
        rows: ["r."],
        frames: [[".r"]],
        frameSeconds: 0.5,
        phaseSeconds: 0,
      });
      const first = store.get("dot");
      time = 0.5;
      expect(store.get("dot")).not.toBe(first);
      time = 1;
      expect(store.get("dot")).toBe(first);
      expect(store.size("dot")).toEqual({ width: 4, height: 2 });
    } finally {
      globalThis.document = previous;
    }
  });

  it("lệch pha và holds đổi khung mà không đổi kích thước", () => {
    installDocument();
    try {
      let time = 0;
      const store = new SpriteStore(() => time);
      store.definePixels("blink", {
        palette: { a: "#ffffff", b: "#000000" },
        rows: ["a"],
        frames: [["b"]],
        holds: [4, 1],
        frameSeconds: 0.2,
        phaseSeconds: 0.8,
      });
      const blinked = store.get("blink");
      time = 0.2;
      expect(store.get("blink")).not.toBe(blinked);
      expect(store.size("blink")).toEqual({ width: 1, height: 1 });
    } finally {
      globalThis.document = previous;
    }
  });

  it("từ chối khung lệch kích thước", () => {
    installDocument();
    try {
      const store = new SpriteStore(() => 0);
      expect(() => store.definePixels("bad", { palette: { a: "#ffffff" }, rows: ["aa"], frames: [["a"]] })).toThrow(/lệch/);
    } finally {
      globalThis.document = previous;
    }
  });
});
