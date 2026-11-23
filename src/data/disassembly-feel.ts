/**
 * Cảm giác pha tháo lắp. Pixel logic trên màn 640×360.
 * Cửa sổ nhịp tính theo beat nghe được, không theo tick.
 */

import { GAME_WIDTH } from "../core/config";
import type { Rect } from "../core/math";

export interface DisassemblyFeel {
  /** Nửa bề rộng cửa sổ đúng nhịp, theo beat. 0,25 = một nửa beat là "kịp". */
  beatWindow: number;
  /** Vặn ốc đủ bấy nhiêu nấc thì ốc rời. */
  unscrewSteps: number;
  /** Giữ confirm bấy nhiêu beat nghe được thì nhấc được. */
  liftBeats: number;
  /** Bộ phận đang chặn sáng trong bấy nhiêu beat. */
  blockFlashBeats: number;
  /** Câu ký ức hiện bấy nhiêu ký tự mỗi giây. */
  memoryCharsPerSecond: number;
}

export const DISASSEMBLY_FEEL: DisassemblyFeel = {
  beatWindow: 0.25,
  unscrewSteps: 3,
  liftBeats: 2,
  blockFlashBeats: 1,
  memoryCharsPerSecond: 28,
};

export interface DisassemblyLayout {
  /** Vùng đặt bộ phận. Tọa độ trong dữ liệu máy là tỉ lệ 0..1 của hình này. */
  bench: Rect;
  /** Dòng chữ ký ức, mép trên (px). */
  memoryY: number;
}

export const DISASSEMBLY_LAYOUT: DisassemblyLayout = {
  bench: {
    x: (GAME_WIDTH - 480) / 2,
    y: 28,
    w: 480,
    h: 250,
  },
  memoryY: 300,
};
