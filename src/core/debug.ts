/**
 * Trạng thái debug dùng chung cho mọi cảnh (F1 bật/tắt, do `Director` xử lý). Một cờ chung thay cho mỗi cảnh một cờ.
 * `session`: phiên nhảy cóc (mốc 5.6): không bao giờ đọc ghi localStorage.
 */
export class DebugState {
  on = false;
  session = false;
}

export const DEBUG = new DebugState();
