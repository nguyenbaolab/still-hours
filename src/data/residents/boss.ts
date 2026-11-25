import { TOWER_CLOCK } from "../mechanisms/tower-clock";
import { BOSS_ROUNDS } from "../patterns/boss";
import type { ResidentData } from "./types";

/** Ông Khải, người thợ đồng hồ đã phí cả đời: một vòng lặp có lối ra, rồi máy tháp đồng hồ. */
export const RESIDENT_BOSS: ResidentData = {
  id: "boss",
  name: "Ông Khải",
  rounds: BOSS_ROUNDS,
  mechanism: TOWER_CLOCK,
  dialogue: { open: "bossOpen", close: "bossClose", idle: "bossIdle" },
  vignette: "leave",
  /** Máu tối đa ở các pha né (5 lần trúng, như trước). Xem docs/balance.md. */
  hp: 20,
};
