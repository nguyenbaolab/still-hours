import { STOPWATCH } from "../mechanisms/stopwatch";
import { R2_ROUNDS } from "../patterns/resident-2";
import type { ResidentData } from "./types";

/** Chú Minh, người cả đời chưa ngẩng đầu nhìn quanh: đứng yên thì thế giới hiện ra, rồi đồng hồ bấm giờ. */
export const RESIDENT_R2: ResidentData = {
  id: "r2",
  name: "Chú Minh",
  rounds: R2_ROUNDS,
  mechanism: STOPWATCH,
  dialogue: { open: "r2Open", close: "r2Close", idle: "r2Idle" },
  vignette: "lookUp",
  /** Máu tối đa ở các pha né (8 lần trúng). Cảm giác người chơi là mức mặc định: bước chuyển từ cư dân 1 nằm ở máu và đạn. Xem docs/balance.md. */
  hp: 32,
};
