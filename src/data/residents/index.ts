import { RESIDENT_BOSS } from "./boss";
import { RESIDENT_R1 } from "./r1";
import { RESIDENT_R2 } from "./r2";
import { RESIDENT_R3 } from "./r3";
import { RESIDENT_R4 } from "./r4";
import type { ResidentData } from "./types";

/** Cư dân và boss theo thứ tự gặp (1 → 2 → 3 → 4 → boss). Thêm cư dân = thêm file dữ liệu và một dòng ở đây. */
export const RESIDENTS: readonly ResidentData[] = [RESIDENT_R1, RESIDENT_R2, RESIDENT_R3, RESIDENT_R4, RESIDENT_BOSS];
