import { METRONOME } from "../mechanisms/metronome";
import { R3_ROUNDS } from "../patterns/resident-3";
import type { ResidentData } from "./types";

/** Chị Vân, người bị lời người khác ám ảnh: lời tiêu cực làm chậm nhịp, rồi máy đếm nhịp. */
export const RESIDENT_R3: ResidentData = {
  id: "r3",
  name: "Chị Vân",
  rounds: R3_ROUNDS,
  mechanism: METRONOME,
  dialogue: { open: "r3Open", close: "r3Close", idle: "r3Idle" },
  vignette: "hum",
  /** Máu tối đa ở các pha né (7 lần trúng). Xem docs/balance.md. */
  hp: 28,
};
