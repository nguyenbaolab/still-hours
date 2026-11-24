/**
 * Chữ của màn kết ngoài thời gian chơi. Câu cuối chỉ xuất hiện MỘT lần trong cả game, ở đây; không dùng lại ở
 * hội thoại, màn thua hay công trạng (test `ending.test.ts` kiểm).
 */
export const ENDING_LINE = "Vẫn chưa muộn.";

export interface CreditLine {
  text: string;
  /** Cỡ chữ. Dòng rỗng chỉ để chừa khoảng trống. */
  size: number;
}

/**
 * Công trạng ngắn, tự cuộn. Chỉ ghi những gì đang đúng: mọi hình và âm đều do mã tạo ra.
 * Mốc 7.1 (font VT323) thêm dòng chữ và giấy phép OFL vào đây, cùng lúc với `CREDITS.md`.
 */
export const CREDITS: readonly CreditLine[] = [
  { text: "Still Hours", size: 32 },
  { text: "", size: 20 },
  { text: "Một trò chơi nhỏ về thời gian", size: 20 },
  { text: "", size: 20 },
  { text: "Âm thanh tổng hợp bằng WebAudio", size: 16 },
  { text: "Hình vẽ bằng mã", size: 16 },
  { text: "", size: 20 },
  { text: "Cảm ơn bạn đã ở lại tới cuối", size: 20 },
];
