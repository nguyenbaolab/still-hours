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

/** Cảnh mở đầu (CLAUDE.md, "Màn mở đầu"). Giây, pixel logic 640×360. */
export interface IntroFeel {
  /** Nhịp tích tắc của cảnh mở. 60 = một tiếng mỗi giây. */
  tickBpm: number;
  /** Sau bấy nhiêu giây thì tiếng tích tắc đầu tiên. */
  firstTickSeconds: number;
  /** Tích tắc chạy một mình bấy nhiêu giây trước khi dòng đầu hiện. */
  leadSeconds: number;
  /** Dòng có chỉ số này (tính từ 0) là chỗ tích tắc dừng hẳn: dòng 2 của lời dẫn. */
  stopAtLine: number;
  /** Im lặng bấy nhiêu giây sau khi tích tắc dừng, rồi chữ của dòng đó mới hiện. */
  silenceSeconds: number;
  /** Mặt đồng hồ trong cảnh, và giờ nó dừng ở đó. */
  clock: { x: number; y: number; radius: number };
  stoppedAt: { hour: number; minute: number };
}

export const INTRO_FEEL: IntroFeel = {
  tickBpm: 60,
  firstTickSeconds: 0.5,
  leadSeconds: 3,
  stopAtLine: 1,
  silenceSeconds: 1.5,
  clock: { x: 320, y: 78, radius: 44 },
  stoppedAt: { hour: 4, minute: 17 },
};

/** Màn kết (CLAUDE.md, "Màn kết"). Giây. */
export interface EndingFeel {
  /** Camera trôi từ tháp về phía tây trong bấy nhiêu giây, không điều khiển. */
  driftSeconds: number;
  /** Mờ đen sau khi camera dừng. */
  fadeSeconds: number;
  /** "Vẫn chưa muộn." hiện sau bấy nhiêu giây kể từ lúc dòng thời gian hiện. */
  closingLineAfterSeconds: number;
  /** Chỉ bấm confirm qua được thẻ thời gian sau bấy nhiêu giây kể từ lúc dòng thời gian hiện. */
  confirmAfterSeconds: number;
  /** Công trạng tự cuộn bấy nhiêu giây; confirm bỏ qua sau `creditsGuardSeconds`. */
  creditsSeconds: number;
  creditsGuardSeconds: number;
  /** Mỗi lớp tích tắc một nhịp: tháp, rồi từng cư dân camera đi ngang (r4, r3, r2, r1). */
  tickBpms: readonly number[];
  /** Một lớp mới bắt đầu sau bấy nhiêu giây kể từ lúc camera đi ngang. */
  layerDelaySeconds: number;
}

export const ENDING_FEEL: EndingFeel = {
  driftSeconds: 40,
  fadeSeconds: 1.5,
  closingLineAfterSeconds: 2,
  confirmAfterSeconds: 4,
  creditsSeconds: 20,
  creditsGuardSeconds: 1,
  tickBpms: [60, 66, 72, 80, 88],
  layerDelaySeconds: 0.2,
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
