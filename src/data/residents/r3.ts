import { placeholderMechanism } from "../mechanisms/placeholder";
import { placeholderRounds } from "../patterns/placeholder";
import { RESIDENT3_PATTERN } from "../patterns/resident-3";
import type { ResidentData } from "./types";

/**
 * Chị Vân, người bị lời người khác ám ảnh. DỮ LIỆU TẠM (mốc 5.5): lượt rút từ pattern lời tiêu cực thử. Mốc 6.3 thay
 * bằng ba lượt có đạn thường, mặt đồng hồ trễ và máy đếm nhịp thật.
 */
export const RESIDENT_R3: ResidentData = {
  id: "r3",
  name: "Chị Vân",
  rounds: placeholderRounds("Chị Vân", RESIDENT3_PATTERN),
  mechanism: placeholderMechanism(
    "máy đếm nhịp",
    { bpm: 88, rhythmic: true },
    ["Sân khấu trường, tràng vỗ tay đầu tiên.", "Cây đàn trên nóc tủ.", "Bài hát viết dở.", "Giọng mình. Lâu rồi không nghe."],
  ),
  dialogue: { open: "r3Open", close: "r3Close", idle: "r3Idle" },
  vignette: "hum",
};
