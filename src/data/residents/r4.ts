import { ALARM_CLOCK } from "../mechanisms/alarm-clock";
import { R4_ROUNDS } from "../patterns/resident-4";
import type { ResidentData } from "./types";

/** Linh, cô bé yêu vẽ. Cơ chế riêng: "Nhặt bút" (CLAUDE.md, mục cư dân 4). */
export const RESIDENT_R4: ResidentData = {
  id: "r4",
  name: "Linh",
  rounds: R4_ROUNDS,
  mechanism: ALARM_CLOCK,
  dialogue: { open: "r4Open", close: "r4Close", idle: "r4Idle" },
  vignette: "pencil",
};
