/**
 * AudioContext giả tối thiểu cho test (không vào bản build): ghi lại node được tạo, đồ thị nối, lịch `start`/`stop` và
 * mọi lệnh đặt tham số. Cố ý nghiêm như WebAudio thật ở những chỗ hay sai: `exponentialRamp` tới giá trị ≤ 0 là lỗi,
 * `start` hai lần là lỗi, `stop` khi chưa `start` là lỗi, thời gian âm hay không hữu hạn là lỗi.
 */

export interface ParamEvent {
  type: "set" | "exp" | "linear" | "target" | "cancel";
  value: number;
  time: number;
}

export class FakeParam {
  value = 0;
  readonly events: ParamEvent[] = [];

  private check(type: ParamEvent["type"], value: number, time: number): void {
    if (!Number.isFinite(value) || !Number.isFinite(time)) throw new RangeError(`${type}: giá trị hoặc thời gian không hữu hạn`);
    if (time < 0) throw new RangeError(`${type}: thời gian âm`);
    if (type === "exp" && value <= 0) throw new RangeError("exponentialRamp tới giá trị ≤ 0");
  }

  setValueAtTime(value: number, time: number): this {
    this.check("set", value, time);
    this.events.push({ type: "set", value, time });
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.check("exp", value, time);
    this.events.push({ type: "exp", value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.check("linear", value, time);
    this.events.push({ type: "linear", value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number, timeConstant: number): this {
    this.check("target", value, time);
    if (!(timeConstant > 0)) throw new RangeError("setTargetAtTime: hằng thời gian phải > 0");
    this.events.push({ type: "target", value, time });
    return this;
  }

  cancelScheduledValues(time: number): this {
    this.events.push({ type: "cancel", value: 0, time });
    return this;
  }
}

export type NodeKind = "gain" | "oscillator" | "filter" | "bufferSource" | "destination";

export class FakeNode {
  readonly gain = new FakeParam();
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
  type = "";
  loop = false;
  buffer: unknown = null;
  readonly out: (FakeNode | FakeParam)[] = [];
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  constructor(readonly kind: NodeKind) {}

  connect<T extends FakeNode | FakeParam>(target: T): T {
    this.out.push(target);
    return target;
  }

  disconnect(): void {
    this.out.length = 0;
  }

  start(time = 0): void {
    if (this.startedAt !== null) throw new Error("start gọi hai lần");
    if (!Number.isFinite(time) || time < 0) throw new RangeError("start: thời gian không hợp lệ");
    this.startedAt = time;
  }

  stop(time = 0): void {
    if (this.startedAt === null) throw new Error("stop khi chưa start");
    if (!Number.isFinite(time) || time < 0) throw new RangeError("stop: thời gian không hợp lệ");
    this.stoppedAt = time;
  }

  /** Có đường nối tới `target` qua các node (không tính nối vào tham số). */
  reaches(target: FakeNode): boolean {
    const seen = new Set<FakeNode>();
    const stack: FakeNode[] = [this];
    while (stack.length > 0) {
      const node = stack.pop() as FakeNode;
      if (node === target) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      for (const next of node.out) if (next instanceof FakeNode) stack.push(next);
    }
    return false;
  }
}

export class FakeContext {
  currentTime = 1;
  sampleRate = 8000;
  readonly nodes: FakeNode[] = [];
  readonly destination = new FakeNode("destination");

  private make(kind: NodeKind): FakeNode {
    const node = new FakeNode(kind);
    this.nodes.push(node);
    return node;
  }

  createGain(): FakeNode {
    return this.make("gain");
  }

  createOscillator(): FakeNode {
    return this.make("oscillator");
  }

  createBiquadFilter(): FakeNode {
    return this.make("filter");
  }

  createBufferSource(): FakeNode {
    return this.make("bufferSource");
  }

  createBuffer(channels: number, length: number, sampleRate: number): { getChannelData(i: number): Float32Array; length: number; sampleRate: number; channels: number } {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: (i) => data[i] as Float32Array, length, sampleRate, channels };
  }

  /** Mọi node nguồn (dao động, nguồn đệm). */
  get sources(): FakeNode[] {
    return this.nodes.filter((n) => n.kind === "oscillator" || n.kind === "bufferSource");
  }

  asContext(): AudioContext {
    return this as unknown as AudioContext;
  }

  asNode(node: FakeNode): AudioNode {
    return node as unknown as AudioNode;
  }
}