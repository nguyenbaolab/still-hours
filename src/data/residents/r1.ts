import { POCKET_WATCH } from "../mechanisms/pocket-watch";
import { R1_ROUNDS } from "../patterns/resident-1";
import type { ResidentData } from "./types";

/** Bác Hòa, người lỡ hẹn với gia đình: tích tắc dồn dập, rồi đồng hồ quả quýt chậm và êm. */
export const RESIDENT_R1: ResidentData = {
  id: "r1",
  name: "Bác Hòa",
  rounds: R1_ROUNDS,
  mechanism: POCKET_WATCH,
  dialogue: { open: "r1Open", close: "r1Close", idle: "r1Idle" },
  vignette: "phone",
  /**
   * Cư dân đầu tiên, màn làm quen: nhiều máu nhất (10 lần trúng mới thua), hitbox nhỏ hơn (8 px thay vì 10: né sát dễ hơn), bất tử
   * sau khi trúng 1,6 giây thay vì 1,0 (không bị trúng liên tiếp). Xem docs/balance.md.
   */
  hp: 40,
  player: { hitboxSize: 8, invincibleSeconds: 1.6 },
};
