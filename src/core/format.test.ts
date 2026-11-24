import { describe, expect, it } from "vitest";
import { formatPlayTime } from "./format";

describe("formatPlayTime", () => {
  it("dưới một giờ: phút và giây", () => {
    expect(formatPlayTime(1361)).toBe("22 phút 41 giây");
    expect(formatPlayTime(59)).toBe("0 phút 59 giây");
    expect(formatPlayTime(60)).toBe("1 phút 0 giây");
    expect(formatPlayTime(3599)).toBe("59 phút 59 giây");
  });

  it("từ 60 phút trở lên: giờ và phút, bỏ giây", () => {
    expect(formatPlayTime(3600)).toBe("1 giờ 0 phút");
    expect(formatPlayTime(3780)).toBe("1 giờ 3 phút");
    expect(formatPlayTime(7325)).toBe("2 giờ 2 phút");
  });

  it("làm tròn xuống; số âm hoặc không hợp lệ là 0", () => {
    expect(formatPlayTime(1361.9)).toBe("22 phút 41 giây");
    expect(formatPlayTime(3599.9)).toBe("59 phút 59 giây");
    expect(formatPlayTime(-5)).toBe("0 phút 0 giây");
    expect(formatPlayTime(Number.NaN)).toBe("0 phút 0 giây");
  });
});
