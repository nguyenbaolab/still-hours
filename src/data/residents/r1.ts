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
  /** Cư dân đầu tiên: nhiều máu nhất (9 lần trúng mới thua). Xem docs/balance.md. */
  hp: 36,
};