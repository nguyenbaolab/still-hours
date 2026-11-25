/** Độ phân giải logic cố định của game (16:9). Mọi toạ độ trong game dùng hệ này. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Số bước update mỗi giây (fixed timestep). Logic game chỉ phụ thuộc vào con số này, không phụ thuộc FPS. */
export const TICK_RATE = 60;

/**
 * Font chính thức: VT323 (SIL Open Font License 1.1), tự host ở `public/assets/fonts/`, nạp bằng `@font-face` trong
 * `style.css`. `main.ts` chờ font nạp xong (tối đa 3 giây) trước khi vẽ chữ đầu tiên. `monospace` là dự phòng.
 * Yêu cầu khi chọn: hỗ trợ đầy đủ dấu tiếng Việt (xem CLAUDE.md).
 */
export const FONT_FAMILY = '"VT323", monospace';

/**
 * Vùng trống góc trên-trái cho nhân vật hướng dẫn, theo pixel logic.
 * Avatar 38×38 vẽ phóng 2 vừa khít 76×76. Viền bàn tháo nằm ngoài bàn 4 px (từ x = 76, y = 24),
 * nên ô kết thúc đúng trước viền đó. Không phủ khung né, thanh HP, khung thoại hay đồng hồ góc phải-trên.
 * Phần tử `#guide-slot` bám vùng này mỗi lần canvas co giãn.
 */
export const GUIDE_SLOT = { x: 0, y: 0, w: 76, h: 76 } as const;
