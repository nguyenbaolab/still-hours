/**
 * Mặt đồng hồ trễ: hai kim cùng quay một vòng trong `secondsPerTurn` giây. Kim mờ chỉ giờ thật đã trôi (`time`, giây
 * nghe được từ beat 0), kim sáng chỉ giờ kịch bản của beat đang nghe (`scriptTime`). Ôm câu thì nhịp chậm, giờ kịch bản
 * đi chậm hơn giờ thật nên kim sáng tụt lại sau kim mờ; độ tụt (độ) bằng `(time − scriptTime) / secondsPerTurn × 360`.
 * Góc tính theo độ, chiều kim đồng hồ, 0 = hướng 12 giờ.
 */
export interface LagClockHands {
  real: number;
  script: number;
  /** `real − script`: kim sáng tụt lại bao nhiêu độ. Không âm khi hệ số nhịp ≤ 1. */
  lagDeg: number;
}

export function lagClockHands(time: number, scriptTime: number, secondsPerTurn: number): LagClockHands {
  const toDeg = (seconds: number): number => (((Math.max(0, seconds) / secondsPerTurn) % 1) * 360);
  const real = toDeg(time);
  const script = toDeg(scriptTime);
  return { real, script, lagDeg: (Math.max(0, time) - Math.max(0, scriptTime)) * (360 / secondsPerTurn) };
}