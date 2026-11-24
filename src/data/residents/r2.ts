import { placeholderMechanism } from "../mechanisms/placeholder";
import { placeholderRounds } from "../patterns/placeholder";
import { TEST_PATTERN } from "../patterns/test-pattern";
import type { ResidentData } from "./types";

/**
 * Chú Minh, người cả đời chưa ngẩng đầu nhìn quanh. DỮ LIỆU TẠM (mốc 5.5): mốc 6.2 thay bằng pha né "đứng yên thì thế
 * giới hiện ra" và đồng hồ bấm giờ thật.
 */
export const RESIDENT_R2: ResidentData = {
  id: "r2",
  name: "Chú Minh",
  rounds: placeholderRounds("Chú Minh", TEST_PATTERN),
  mechanism: placeholderMechanism(
    "đồng hồ bấm giờ",
    { bpm: 96, rhythmic: true },
    ["Con diều mắc trên dây điện.", "Mùa hoa sữa, năm nào cũng vội.", "Con mèo chờ ở bậc cửa.", "Bầu trời hôm ấy rất xanh."],
  ),
  dialogue: { open: "r2Open", close: "r2Close", idle: "r2Idle" },
  vignette: "lookUp",
};
