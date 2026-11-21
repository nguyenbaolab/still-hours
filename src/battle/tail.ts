/** Một điểm trên đuôi nét đang tắt dần sau bánh răng. */
interface TailPoint {
  x: number;
  y: number;
  age: number;
  width: number;
}

/** Đuôi ngắn lúc chơi. Không phải nét đã lưu. */
export class StrokeTail {
  readonly points: TailPoint[] = [];

  /** Ghi vị trí khi bút đang chạm giấy. `dt` và `life` tính bằng giây. */
  note(x: number, y: number, width: number, dt: number, life: number): void {
    for (const point of this.points) point.age += dt;
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) >= 1) this.points.push({ x, y, age: 0, width });
    while (this.points.length > 0 && (this.points[0] as TailPoint).age > life) this.points.shift();
  }

  clear(): void {
    this.points.length = 0;
  }
}
