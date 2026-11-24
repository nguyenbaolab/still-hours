/**
 * Thời gian chơi cho người đọc: "22 phút 41 giây"; từ 60 phút trở lên: "1 giờ 3 phút". Làm tròn xuống, số âm hoặc
 * không hợp lệ coi là 0.
 */
export function formatPlayTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  if (total >= 3600) {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${hours} giờ ${minutes} phút`;
  }
  return `${Math.floor(total / 60)} phút ${total % 60} giây`;
}
