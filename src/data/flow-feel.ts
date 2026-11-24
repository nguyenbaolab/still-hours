/**
 * Cảm giác của luồng game: chuyển cảnh, thua, dọn đạn. Giây.
 * Các số của hội thoại, thị trấn, đứng yên, lưu tiến trình thêm vào đây ở các mốc sau.
 */
export interface FlowFeel {
  /** Mờ đen giữa mọi cảnh và giữa các pha. */
  fadeSeconds: number;
  /** Pha né kiểu `length` xong: đạn còn lại mờ đi trong bấy nhiêu giây, không trừ máu. */
  clearSeconds: number;
  /** Màn thua: bánh răng nứt nằm yên giữa màn tối. */
  loseHoldSeconds: number;
  /** Sau khi vết nứt khép lại (bánh răng lành), chờ bấy nhiêu giây rồi pha né mờ vào lại. */
  mendSeconds: number;
}

export const FLOW_FEEL: FlowFeel = {
  fadeSeconds: 0.4,
  clearSeconds: 0.6,
  loseHoldSeconds: 1.2,
  mendSeconds: 0.35,
};

/** Hộp hội thoại và cách hiện chữ (CLAUDE.md, "Hội thoại"). Pixel logic 640×360. */
export interface DialogueFeel {
  charsPerSecond: number;
  /** Dừng thêm sau dấu phẩy (giây). */
  commaPause: number;
  /** Dừng thêm sau `. ? ! …` (giây), chỉ ở cuối một chuỗi dấu. */
  stopPause: number;
  /** Phát tiếng `blip` mỗi bấy nhiêu ký tự hiện ra. */
  blipEvery: number;
  /** Giữ X: chữ chạy nhanh gấp bấy nhiêu. */
  fastMultiplier: number;
  /** Giữ X: hiện hết dòng rồi tự sang dòng sau sau bấy nhiêu giây. */
  fastHoldSeconds: number;
  /** Mỗi dòng thoại không dài hơn bấy nhiêu ký tự (kiểm bằng test dữ liệu). */
  maxChars: number;
  box: { x: number; y: number; w: number; h: number; border: number; padding: number };
  fontSize: number;
  lineHeight: number;
  maxLines: number;
}

export const DIALOGUE_FEEL: DialogueFeel = {
  charsPerSecond: 30,
  commaPause: 0.12,
  stopPause: 0.3,
  blipEvery: 2,
  fastMultiplier: 8,
  fastHoldSeconds: 0.15,
  maxChars: 110,
  box: { x: 16, y: 252, w: 608, h: 92, border: 4, padding: 12 },
  fontSize: 20,
  lineHeight: 22,
  maxLines: 3,
};

/** Lưu tiến trình (CLAUDE.md, "Lưu tiến trình"). */
export interface SaveFeel {
  /** Sai số (px) khi giản lược tranh của r4 bằng Ramer–Douglas–Peucker. */
  drawingEpsilon: number;
  /** Tranh lưu không quá bấy nhiêu số; quá thì tăng sai số gấp đôi tới khi vừa. */
  drawingMaxNumbers: number;
}

export const SAVE_FEEL: SaveFeel = {
  drawingEpsilon: 1.5,
  drawingMaxNumbers: 3000,
};

/** Đi lại trong thị trấn (CLAUDE.md, "Thị trấn"). Pixel logic 640×360. */
export interface TownFeel {
  /** Cạnh một ô (px). */
  tile: number;
  walkSpeed: number;
  /** Giữ Shift: đi chậm. */
  slowSpeed: number;
  /** Hitbox chân của người thợ (px), tâm ở chân. */
  hitbox: { w: number; h: number };
  /** Z tương tác với đối tượng trong tầm này (px, từ tâm người thợ tới tâm đối tượng), theo hướng đang nhìn. */
  interactRange: number;
  /** Camera chỉ trôi ngang; chiều dọc lệch xuống bấy nhiêu px (bản đồ cao 352 so với màn 360). */
  cameraOffsetY: number;
  /** Chỗ ngắm cảnh: khung cảnh hiện toàn màn sau bấy nhiêu giây mờ. */
  spotFadeSeconds: number;
  /** Cổng "khoảnh khắc đông cứng" lấp lánh theo nhịp bấy nhiêu BPM. */
  gateBpm: number;
}

export const TOWN_FEEL: TownFeel = {
  tile: 32,
  walkSpeed: 140,
  slowSpeed: 70,
  hitbox: { w: 20, h: 12 },
  interactRange: 28,
  cameraOffsetY: 4,
  spotFadeSeconds: 1,
  gateBpm: 40,
};
