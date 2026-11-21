/**
 * Pool đối tượng: cấp phát SẴN một lần, rồi tái sử dụng, nên giữa trận không tạo rác cho bộ gom rác (GC)
 * và không giật khi nhiều đạn. Các phần tử đang hoạt động luôn nằm liền nhau ở đầu mảng.
 *
 * Cách duyệt (không tạo closure mỗi khung hình):
 *   for (let i = 0; i < pool.size; ) {
 *     const item = pool.at(i);
 *     if (cònSống(item)) i++; else pool.release(i);   // release hoán đổi phần tử cuối vào chỗ i, nên không tăng i
 *   }
 */
export class Pool<T> {
  private readonly items: T[];
  private count = 0;

  constructor(
    readonly capacity: number,
    create: () => T,
  ) {
    this.items = Array.from({ length: capacity }, create);
  }

  /** Số phần tử đang hoạt động. */
  get size(): number {
    return this.count;
  }

  at(index: number): T {
    return this.items[index] as T;
  }

  /** Lấy một phần tử trống (chưa được khởi tạo giá trị, người gọi tự gán). Null nếu hết chỗ. */
  acquire(): T | null {
    return this.count < this.capacity ? (this.items[this.count++] as T) : null;
  }

  /** Thu hồi phần tử ở vị trí `index` bằng cách hoán đổi với phần tử hoạt động cuối cùng. */
  release(index: number): void {
    const last = this.count - 1;
    const released = this.items[index] as T;
    this.items[index] = this.items[last] as T;
    this.items[last] = released;
    this.count = last;
  }

  clear(): void {
    this.count = 0;
  }
}
