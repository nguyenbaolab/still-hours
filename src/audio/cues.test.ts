import { describe, expect, it } from "vitest";
import { FakeContext } from "../testing/fake-context";
import { CUE_NAMES, playCue } from "./cues";
import { createTickSink } from "./tick-sound";
import { createWindBed } from "./wind";
import { AUDIO_FEEL } from "../data/rhythm-feel";
import { AMBIENCE_FEEL } from "../data/flow-feel";

describe("cues procedural", () => {
  for (const cue of CUE_NAMES) {
    it(`${cue}: chạy không ném lỗi, mọi nguồn có start rồi stop, và nối tới đầu ra`, () => {
      const ctx = new FakeContext();
      const now = ctx.currentTime;
      playCue(ctx.asContext(), ctx.asNode(ctx.destination), cue, now, 440);

      expect(ctx.sources.length).toBeGreaterThan(0);
      for (const source of ctx.sources) {
        expect(source.startedAt, `${cue}: nguồn chưa start`).not.toBeNull();
        expect(source.stoppedAt, `${cue}: nguồn không bao giờ stop`).not.toBeNull();
        expect(source.stoppedAt as number).toBeGreaterThanOrEqual(source.startedAt as number);
        expect(source.startedAt as number).toBeGreaterThanOrEqual(now);
        expect(source.reaches(ctx.destination), `${cue}: nguồn không nối tới đầu ra`).toBe(true);
      }
    });
  }

  it("cue nào cũng ngắn (tiếng ngân dài nhất dưới 4 giây)", () => {
    for (const cue of CUE_NAMES) {
      const ctx = new FakeContext();
      playCue(ctx.asContext(), ctx.asNode(ctx.destination), cue, ctx.currentTime);
      const end = Math.max(...ctx.sources.map((s) => s.stoppedAt as number));
      expect(end - ctx.currentTime, cue).toBeLessThan(4);
    }
  });

  it("blip lấy cao độ từ tham số", () => {
    const ctx = new FakeContext();
    playCue(ctx.asContext(), ctx.asNode(ctx.destination), "blip", ctx.currentTime, 523);
    const osc = ctx.sources[0];
    expect(osc?.frequency.events[0]?.value).toBe(523);
  });
});

describe("tiếng tích", () => {
  it("sink thường và sink xa đều hẹn đủ nguồn, hủy được trước giờ phát", () => {
    for (const voice of [undefined, { gain: AMBIENCE_FEEL.distantGain, softnessHz: AMBIENCE_FEEL.distantSoftnessHz }]) {
      const ctx = new FakeContext();
      const sink = createTickSink(ctx.asContext(), ctx.asNode(ctx.destination), AUDIO_FEEL, voice);
      const handle = sink.play(ctx.currentTime + 0.1, "tick");
      sink.play(ctx.currentTime + 0.2, "tock");
      expect(ctx.sources).toHaveLength(6);
      for (const source of ctx.sources) {
        expect(source.stoppedAt).not.toBeNull();
        expect(source.reaches(ctx.destination)).toBe(true);
      }
      handle.cancel();
      expect(ctx.sources.slice(0, 3).every((s) => s.stoppedAt === 0)).toBe(true);
    }
  });

  it("sink xa nhỏ hơn: có thêm một gain tầng và cắt cao thấp hơn", () => {
    const loud = new FakeContext();
    createTickSink(loud.asContext(), loud.asNode(loud.destination), AUDIO_FEEL);
    const far = new FakeContext();
    createTickSink(far.asContext(), far.asNode(far.destination), AUDIO_FEEL, { gain: 0.3, softnessHz: 900 });
    const farBus = far.nodes.find((n) => n.kind === "filter");
    expect(farBus?.frequency.value).toBe(900);
    expect(far.nodes.some((n) => n.kind === "gain" && n.gain.value === 0.3)).toBe(true);
    expect(loud.nodes.some((n) => n.kind === "gain" && n.gain.value === 0.3)).toBe(false);
  });
});

describe("gió nền", () => {
  it("nguồn nhiễu lặp, bắt đầu im, bật dần rồi tắt dần", () => {
    const ctx = new FakeContext();
    const bed = createWindBed(ctx.asContext(), ctx.asNode(ctx.destination), AMBIENCE_FEEL);
    const noise = ctx.nodes.find((n) => n.kind === "bufferSource");
    expect(noise?.loop).toBe(true);
    expect(noise?.startedAt).not.toBeNull();
    expect(noise?.reaches(ctx.destination)).toBe(true);

    // Gain cuối chuỗi bắt đầu ở 0: chưa có gì nghe thấy.
    const level = ctx.nodes.filter((n) => n.kind === "gain").at(-1);
    expect(level?.gain.value).toBe(0);

    bed.setLevel(AMBIENCE_FEEL.windLevel, 1.2);
    expect(level?.gain.events.at(-1)).toMatchObject({ type: "target", value: AMBIENCE_FEEL.windLevel });
    bed.setLevel(0, 1.2);
    expect(level?.gain.events.at(-1)).toMatchObject({ type: "target", value: 0 });
  });
});