import { describe, expect, it } from "vitest";
import { BackgroundTicker } from "../audio/background-ticker";
import { TICK_RATE } from "../core/config";
import { Input } from "../core/input";
import { AMBIENCE_FEEL, FLOW_FEEL } from "../data/flow-feel";
import { RESIDENTS } from "../data/residents";
import { TOWN } from "../data/town";
import { FakeAudio, type PlayRecord } from "../testing/sim";
import { Director } from "./director";
import type { Scene } from "./scene";
import { TitleScene } from "./title";
import { TownScene } from "./town";

const measure = (text: string): number => text.length * 8;

/** Chạy `ticks` tick: đồng hồ âm thanh giả tiến 1/60 giây, input được poll. */
function run(audio: FakeAudio, input: Input, ticks: number, update: () => void): void {
  for (let i = 0; i < ticks; i++) {
    audio.t += 1 / TICK_RATE;
    input.poll();
    update();
  }
}

function gaps(plays: readonly PlayRecord[]): number[] {
  const live = plays.filter((p) => !p.cancelled);
  return live.slice(1).map((p, i) => p.time - (live[i] as PlayRecord).time);
}

describe("nền thị trấn", () => {
  it("bật gió ở tick đầu và hẹn tiếng tích xa 40 BPM (1,5 giây một tiếng), tích/tắc xen kẽ, không đụng sink của trận", () => {
    const input = new Input();
    const audio = new FakeAudio(5, 0.03);
    const scene = new TownScene(TOWN, RESIDENTS, { freed: [] }, input, audio, measure);
    expect(audio.wind).toBe(0);

    run(audio, input, 12 * TICK_RATE, () => scene.update());

    expect(audio.wind).toBe(AMBIENCE_FEEL.windLevel);
    expect(audio.plays).toHaveLength(0);
    expect(audio.distantPlays.length).toBeGreaterThanOrEqual(7);
    for (const gap of gaps(audio.distantPlays)) expect(gap).toBeCloseTo(60 / AMBIENCE_FEEL.townTickBpm, 6);
    audio.distantPlays.forEach((p, i) => expect(p.kind).toBe(i % 2 === 0 ? "tick" : "tock"));
  });

  it("rời cảnh thì gió về 0 và tiếng đã hẹn mà chưa phát bị hủy; không hẹn thêm", () => {
    const input = new Input();
    const audio = new FakeAudio(5, 0.03);
    const scene = new TownScene(TOWN, RESIDENTS, { freed: [] }, input, audio, measure);
    run(audio, input, 4 * TICK_RATE, () => scene.update());
    const before = audio.distantPlays.length;
    scene.leave();
    expect(audio.wind).toBe(0);
    // Mọi tiếng còn ở tương lai đã bị hủy.
    for (const play of audio.distantPlays) if (play.time > audio.t) expect(play.cancelled).toBe(true);
    expect(audio.distantPlays.length).toBe(before);
  });

  it("cảnh chỉ để vẽ (màn kết) không bật gió", () => {
    const audio = new FakeAudio(5, 0.03);
    new TownScene(TOWN, RESIDENTS, { freed: ["r1", "r2", "r3", "r4"] }, new Input(), audio, measure);
    expect(audio.windHistory).toHaveLength(0);
  });
});

describe("Director gọi leave khi đổi cảnh", () => {
  class Leaver implements Scene {
    left = 0;
    update(): void {}
    render(): void {}
    leave(): void {
      this.left++;
    }
  }

  it("fadeTo và cut đều dọn cảnh cũ đúng một lần", () => {
    const input = new Input();
    const audio = new FakeAudio(5, 0);
    const a = new Leaver();
    const b = new Leaver();
    const c = new Leaver();
    const director = new Director(input, audio, a);
    director.fadeTo(() => b);
    for (let i = 0; i < Math.ceil(FLOW_FEEL.fadeSeconds * TICK_RATE) + 3; i++) {
      input.poll();
      director.update();
    }
    expect(director.scene).toBe(b);
    expect(a.left).toBe(1);
    expect(b.left).toBe(0);
    director.cut(c);
    expect(b.left).toBe(1);
    director.cut(c);
    expect(c.left).toBe(0);
  });
});

describe("tích mỗi giây ở màn bắt đầu", () => {
  function title() {
    const input = new Input();
    const audio = new FakeAudio(5, 0.03);
    const scene = new TitleScene(
      audio,
      input,
      { exists: () => true, clear: () => undefined },
      () => new BackgroundTicker(audio, AMBIENCE_FEEL.titleTickBpm, audio.tickSink, AMBIENCE_FEEL.tickDelaySeconds),
    );
    return { scene, input, audio };
  }

  it("mỗi giây một tiếng, trong lúc chờ phím và cả khi đang ở menu", () => {
    const { scene, input, audio } = title();
    run(audio, input, 6 * TICK_RATE, () => scene.update());
    expect(audio.plays.length).toBeGreaterThanOrEqual(5);
    for (const gap of gaps(audio.plays)) expect(gap).toBeCloseTo(1, 6);
  });

  it("chọn xong thì dừng hẳn, tiếng đã hẹn bị hủy", () => {
    const { scene, input, audio } = title();
    const tick = (): void => scene.update();
    run(audio, input, 3 * TICK_RATE, tick);
    // Chạy tới lúc có một tiếng đã hẹn mà chưa phát, rồi chọn ngay (ba tick, ngắn hơn thời gian hẹn trước).
    for (let guard = 0; guard < TICK_RATE * 3 && !audio.plays.some((p) => p.time > audio.t); guard++) run(audio, input, 1, tick);
    expect(audio.plays.some((p) => p.time > audio.t)).toBe(true);
    // Phím đầu tiên (âm thanh đã sẵn nên bản này chờ một phím thật) rồi confirm ở menu.
    input.setActionState("test", "confirm", true);
    run(audio, input, 1, tick);
    input.setActionState("test", "confirm", false);
    run(audio, input, 1, tick);
    input.setActionState("test", "confirm", true);
    run(audio, input, 1, tick);
    expect(scene.result).toBe("continue");
    const count = audio.plays.length;
    const finishedAt = audio.t;
    // Mọi tiếng hẹn cho tương lai (sau lúc chọn xong) đã bị hủy.
    const future = audio.plays.filter((p) => p.time > finishedAt);
    expect(future.length).toBeGreaterThan(0);
    for (const play of future) expect(play.cancelled).toBe(true);
    input.setActionState("test", "confirm", false);
    run(audio, input, 4 * TICK_RATE, tick);
    expect(audio.plays.length).toBe(count);
  });

  it("không có ticker (không truyền) thì im lặng", () => {
    const input = new Input();
    const audio = new FakeAudio(5, 0);
    const scene = new TitleScene(audio, input, { exists: () => false, clear: () => undefined });
    run(audio, input, 3 * TICK_RATE, () => scene.update());
    expect(audio.plays).toHaveLength(0);
  });
});