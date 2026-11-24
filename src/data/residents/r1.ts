import { placeholderMechanism } from "../mechanisms/placeholder";
import { placeholderRounds } from "../patterns/placeholder";
import { TEST_PATTERN } from "../patterns/test-pattern";
import type { ResidentData } from "./types";

/**
 * Bác Hòa, người lỡ hẹn với gia đình. DỮ LIỆU TẠM (mốc 5.5): lượt rút từ pattern thử, máy tạm. Mốc 6.1 thay bằng
 * pattern tích tắc dồn dập và đồng hồ quả quýt thật.
 */
export const RESIDENT_R1: ResidentData = {
  id: "r1",
  name: "Bác Hòa",
  rounds: placeholderRounds("Bác Hòa", TEST_PATTERN),
  mechanism: placeholderMechanism(
    "đồng hồ quả quýt",
    { bpm: 60, rhythmic: false, showHint: true },
    ["Mâm cơm để phần, đã nguội.", "Ba cuộc gọi nhỡ. Con gái.", "Bánh sinh nhật chưa cắt.", "Con hỏi: mai ba có về không?"],
  ),
  dialogue: { open: "r1Open", close: "r1Close", idle: "r1Idle" },
  vignette: "phone",
};
