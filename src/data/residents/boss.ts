import { placeholderMechanism } from "../mechanisms/placeholder";
import { placeholderRounds } from "../patterns/placeholder";
import { TEST_PATTERN } from "../patterns/test-pattern";
import type { ResidentData } from "./types";

/**
 * Ông Khải, người thợ đồng hồ đã phí cả đời. DỮ LIỆU TẠM (mốc 5.5): lượt rút từ pattern thử, chưa có khe cửa. Mốc 6.4
 * thay bằng vòng lặp có lối ra và máy tháp đồng hồ thật.
 */
export const RESIDENT_BOSS: ResidentData = {
  id: "boss",
  name: "Ông Khải",
  rounds: placeholderRounds("Ông Khải", TEST_PATTERN),
  mechanism: placeholderMechanism(
    "máy tháp đồng hồ",
    { bpm: 72, rhythmic: true },
    ["Tiệm chưa bao giờ đóng cửa sớm.", "Lá thư viết xong, chưa gửi.", "Sang năm. Sang năm nữa.", "Còn kịp không?"],
  ),
  dialogue: { open: "bossOpen", close: "bossClose", idle: "bossIdle" },
  vignette: "leave",
};
