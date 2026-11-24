import type { Mechanism } from "../mechanisms/types";
import type { Pattern } from "../pattern-types";

export type ResidentId = "r1" | "r2" | "r3" | "r4" | "boss";

/**
 * Dữ liệu của một cư dân (hoặc boss). Thêm cư dân = thêm một file dữ liệu, không sửa engine.
 * Các trường hội thoại, cảnh kết và vị trí trong thị trấn được thêm ở các mốc sau (4.3, 5.3).
 */
export interface ResidentData {
  id: ResidentId;
  /** Tên hiện trong hội thoại. */
  name: string;
  /** Pha né của lượt 1, 2, 3. */
  rounds: readonly [Pattern, Pattern, Pattern];
  /** Cỗ máy 3 tầng, `core` ở tầng 3. */
  mechanism: Mechanism;
}
