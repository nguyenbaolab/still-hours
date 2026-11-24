import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AMBIENCE_FEEL } from "../data/flow-feel";
import { AUDIO_FEEL } from "../data/rhythm-feel";
import { FakeContext, type FakeNode } from "../testing/fake-context";
import { AudioEngine } from "./audio-engine";

/** AudioContext giả có thêm vòng đời (resume/suspend/state) mà AudioEngine dùng. */
class StubAudioContext extends FakeContext {
  static last: StubAudioContext | null = null;
  state = "suspended";
  outputLatency = 0;
  baseLatency = 0;
  constructor() {
    super();
    StubAudioContext.last = this;
  }
  resume(): Promise<void> {
    this.state = "running";
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = "suspended";
    return Promise.resolve();
  }
  addEventListener(): void {}
}

type Listener = () => void;
let listeners: Map<string, Listener[]>;

function press(): void {
  for (const listener of listeners.get("keydown") ?? []) listener();
}

async function unlocked(): Promise<{ engine: AudioEngine; ctx: StubAudioContext }> {
  const engine = new AudioEngine(AUDIO_FEEL, 0);
  press();
  await Promise.resolve();
  await Promise.resolve();
  return { engine, ctx: StubAudioContext.last as StubAudioContext };
}

/** Gain tổng: nút gain nối thẳng vào đầu ra. */
function master(ctx: StubAudioContext): FakeNode {
  return ctx.nodes.find((n) => n.kind === "gain" && n.out.includes(ctx.destination)) as FakeNode;
}

/** Gain cuối của chuỗi gió: nút gain đang nhận nhiễu dài vòng lặp và nối vào gain tổng. */
function windLevel(ctx: StubAudioContext): FakeNode {
  const noise = ctx.nodes.find((n) => n.kind === "bufferSource" && n.loop) as FakeNode;
  let node: FakeNode = noise;
  while (!node.out.includes(master(ctx))) {
    node = node.out.find((n): n is FakeNode => "kind" in n) as FakeNode;
  }
  return node;
}

describe("AudioEngine", () => {
  beforeEach(() => {
    listeners = new Map();
    StubAudioContext.last = null;
    vi.stubGlobal("AudioContext", StubAudioContext);
    vi.stubGlobal("window", {
      addEventListener: (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    });
    vi.stubGlobal("document", { hidden: false, addEventListener: () => undefined });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mở khóa sau phím đầu tiên, có sink tích xa và gió", async () => {
    const { engine, ctx } = await unlocked();
    expect(engine.ready).toBe(true);
    expect(engine.tickSink).not.toBeNull();
    expect(engine.distantSink).not.toBeNull();
    expect(windLevel(ctx).gain.value).toBe(0);
  });

  it("gió bật dần theo setWind và tắt dần về 0", async () => {
    const { engine, ctx } = await unlocked();
    engine.setWind(AMBIENCE_FEEL.windLevel);
    expect(windLevel(ctx).gain.events.at(-1)).toMatchObject({ type: "target", value: AMBIENCE_FEEL.windLevel });
    engine.setWind(0);
    expect(windLevel(ctx).gain.events.at(-1)).toMatchObject({ type: "target", value: 0 });
  });

  it("setWind trước khi mở khóa được nhớ lại và áp dụng khi mở khóa", async () => {
    const engine = new AudioEngine(AUDIO_FEEL, 0);
    engine.setWind(AMBIENCE_FEEL.windLevel);
    press();
    await Promise.resolve();
    const ctx = StubAudioContext.last as StubAudioContext;
    expect(windLevel(ctx).gain.events.at(-1)).toMatchObject({ type: "target", value: AMBIENCE_FEEL.windLevel });
  });

  it("tắt tiếng đưa gain tổng (nên cả gió và tích xa) về 0; bật lại thì trả về âm lượng cũ", async () => {
    const { engine, ctx } = await unlocked();
    engine.setWind(AMBIENCE_FEEL.windLevel);
    const gain = master(ctx);
    expect(gain.gain.value).toBe(AUDIO_FEEL.volume);
    engine.setMuted(true);
    expect(gain.gain.value).toBe(0);
    engine.setMuted(false);
    expect(gain.gain.value).toBe(AUDIO_FEEL.volume);
    engine.toggleMute();
    expect(gain.gain.events.at(-1)).toMatchObject({ type: "target", value: 0 });
    // Gió và tích xa đều đi qua gain tổng đó.
    expect(windLevel(ctx).out).toContain(gain);
  });

  it("playCue sau khi mở khóa không ném lỗi với mọi cue", async () => {
    const { engine } = await unlocked();
    for (const cue of ["blip", "ring", "hum", "bird", "chime", "mend", "pencilUp", "pencilDrop", "drawTick"] as const) {
      expect(() => engine.playCue(cue, 440)).not.toThrow();
    }
  });
});