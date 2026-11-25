import type { DialogueId } from "../dialogues";
import type { Mechanism } from "../mechanisms/types";
import type { Pattern } from "../pattern-types";

export type ResidentId = "r1" | "r2" | "r3" | "r4" | "boss";

/** Cảnh kết của cư dân ở thị trấn (~10 giây, không bắt buộc có chữ). */
export type VignetteKind = "phone" | "lookUp" | "hum" | "pencil" | "leave";

/**
 * Dữ liệu của một cư dân (hoặc boss). Thêm cư dân = thêm một file dữ liệu, không sửa engine.
 * Vị trí trong thị trấn được thêm ở mốc 5.3.
 */
export interface ResidentData {
  id: ResidentId;
  /** Tên hiện trong hội thoại. */
  name: string;
  /** Pha né của lượt 1, 2, 3. */
  rounds: readonly [Pattern, Pattern, Pattern];
  /** Cỗ máy 3 tầng, `core` ở tầng 3. */
  mechanism: Mechanism;
  dialogue: {
    /** Trước trận, ở thị trấn, cạnh cư dân. */
    open: DialogueId;
    /** Sau trận, trong cảnh trận, nền tối. */
    close: DialogueId;
    /** Sau khi được giải thoát, ở thị trấn: Z để nghe một câu. */
    idle: DialogueId;
  };
  vignette: VignetteKind;
  /**
   * Máu tối đa của người chơi ở các pha né của trận này (bỏ trống = `PLAYER_FEEL.maxHp`). Độ khó tăng dần theo thứ tự gặp:
   * cư dân đầu nhiều máu nhất, boss ít nhất (xem docs/balance.md).
   */
  hp?: number;
}
