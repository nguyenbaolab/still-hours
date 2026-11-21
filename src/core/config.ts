/** Độ phân giải logic cố định của game (16:9). Mọi toạ độ trong game dùng hệ này. */
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;

/** Số bước update mỗi giây (fixed timestep). Logic game chỉ phụ thuộc vào con số này, không phụ thuộc FPS. */
export const TICK_RATE = 60;

/**
 * Font tạm thời. CHƯA chọn font chính thức.
 * Yêu cầu khi chọn: hỗ trợ đầy đủ dấu tiếng Việt (xem CLAUDE.md).
 */
export const FONT_FAMILY = "monospace";
