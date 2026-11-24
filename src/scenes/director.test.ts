import { describe, expect, it } from "vitest";
import { TICK_RATE } from "../core/config";
import { DEBUG } from "../core/debug";
import { Input } from "../core/input";
import { FLOW_FEEL } from "../data/flow-feel";
import { FakeAudio } from "../testing/sim";
import { Director } from "./director";
import type { Scene } from "./scene";
import { TitleScene } from "./title";

class Probe implements Scene {
  updates = 0;
  constructor(readonly countsPlayTime?: boolean) {}
  update(): void {
    this.updates++;
  }
  render(): void {}
}

const FADE_TICKS = Math.ceil(FLOW_FEEL.fadeSeconds * TICK_RATE);

function setup(first: Scene = new Probe()) {
  const input = new Input();
  const audio = new FakeAudio(5, 0);
  const director = new Director(input, audio, first);
  const tick = (keys: Partial<Record<"debug" | "mute", boolean>> = {}): void => {
    input.setActionState("test", "debug", keys.debug ?? false);
    input.setActionState("test", "mute", keys.mute ?? false);
    input.poll();
    director.update();
  };
  return { input, audio, director, tick };
}

describe("Director: chuyển cảnh", () => {
  it("cảnh mới chỉ được dựng và update sau khi mờ ra xong", () => {
    const a = new Probe();
    const s = setup(a);
    let built = 0;
    const b = new Probe();
    s.director.fadeTo(() => {
      built++;
      return b;
    });
    expect(s.director.transitioning).toBe(true);

    for (let i = 0; i < FADE_TICKS - 2; i++) s.tick();
    expect(built).toBe(0);
    expect(s.director.scene).toBe(a);
    expect(b.updates).toBe(0);
    // Cảnh cũ đứng yên trong lúc mờ ra.
    expect(a.updates).toBe(0);

    for (let i = 0; i < 4; i++) s.tick();
    expect(built).toBe(1);
    expect(s.director.scene).toBe(b);
    expect(b.updates).toBeLessThanOrEqual(3);
  });

  it("độ phủ đen tăng rồi giảm, và về 0 khi chuyển xong", () => {
    const s = setup();
    s.director.fadeTo(() => new Probe());
    let peak = 0;
    for (let i = 0; i < FADE_TICKS * 2 + 4; i++) {
      s.tick();
      peak = Math.max(peak, s.director.cover);
    }
    expect(peak).toBeGreaterThan(0.9);
    expect(s.director.cover).toBe(0);
    expect(s.director.transitioning).toBe(false);
  });

  it("đổi đích giữa chừng thì dùng cảnh mới nhất, chỉ dựng một lần", () => {
    const s = setup();
    let first = 0;
    let second = 0;
    s.director.fadeTo(() => {
      first++;
      return new Probe();
    });
    for (let i = 0; i < 5; i++) s.tick();
    s.director.fadeTo(() => {
      second++;
      return new Probe();
    });
    for (let i = 0; i < FADE_TICKS * 2 + 4; i++) s.tick();
    expect(first).toBe(0);
    expect(second).toBe(1);
  });

  it("cut đổi ngay, không mờ", () => {
    const s = setup();
    const b = new Probe();
    s.director.cut(b);
    s.tick();
    expect(s.director.scene).toBe(b);
    expect(b.updates).toBe(1);
    expect(s.director.transitioning).toBe(false);
  });
});

describe("Director: việc chung của mọi cảnh", () => {
  it("playSeconds tăng đúng 1 sau 60 tick; cảnh countsPlayTime = false thì không tính", () => {
    const s = setup(new Probe());
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.director.playSeconds).toBeCloseTo(1, 9);

    const quiet = setup(new Probe(false));
    for (let i = 0; i < 60; i++) quiet.tick();
    expect(quiet.director.playSeconds).toBe(0);
  });

  it("F1 bật/tắt cờ debug chung, M tắt/bật tiếng", () => {
    const s = setup();
    DEBUG.on = false;
    s.tick({ debug: true });
    expect(DEBUG.on).toBe(true);
    s.tick();
    s.tick({ debug: true });
    expect(DEBUG.on).toBe(false);

    expect(s.audio.muted).toBe(false);
    s.tick({ mute: true });
    expect(s.audio.muted).toBe(true);
  });
});

describe("TitleScene: menu", () => {
  function title(exists: boolean) {
    let saved = exists;
    const gate = { ready: false };
    const input = new Input();
    const scene = new TitleScene(gate, input, { exists: () => saved, clear: () => void (saved = false) });
    const press = (...actions: ("up" | "down" | "confirm" | "cancel")[]): void => {
      // Mỗi hành động một tick riêng, có tick nhả giữa chúng để tính là lần bấm mới.
      for (const action of actions) {
        input.setActionState("t", action, true);
        input.poll();
        scene.update();
        input.setActionState("t", action, false);
        input.poll();
        scene.update();
      }
    };
    return { gate, scene, press, saved: () => saved };
  }

  it("chưa mở khóa âm thanh thì chưa đi đâu; không có bản lưu thì vào thẳng màn mở đầu", () => {
    const t = title(false);
    t.press("confirm");
    expect(t.scene.result).toBeNull();
    t.gate.ready = true;
    t.press();
    t.scene.update();
    expect(t.scene.result).toBe("new");
    expect(t.scene.inMenu).toBe(false);
  });

  it("có bản lưu: menu lên/xuống vòng đúng; Tiếp tục → continue", () => {
    const t = title(true);
    t.gate.ready = true;
    t.scene.update();
    expect(t.scene.inMenu).toBe(true);
    expect(t.scene.selected).toBe(0);
    t.press("down");
    expect(t.scene.selected).toBe(1);
    t.press("down");
    expect(t.scene.selected).toBe(0);
    t.press("up");
    expect(t.scene.selected).toBe(1);
    t.press("up");
    expect(t.scene.selected).toBe(0);
    t.press("confirm");
    expect(t.scene.result).toBe("continue");
    expect(t.saved()).toBe(true);
  });

  it('"Bắt đầu lại" cần xác nhận: X thì quay về menu và giữ bản lưu, Z thì xóa và bắt đầu mới', () => {
    const t = title(true);
    t.gate.ready = true;
    t.scene.update();
    t.press("down", "confirm");
    expect(t.scene.confirmingReset).toBe(true);
    expect(t.scene.result).toBeNull();
    expect(t.saved()).toBe(true);

    t.press("cancel");
    expect(t.scene.inMenu).toBe(true);
    expect(t.saved()).toBe(true);

    t.press("confirm");
    expect(t.scene.confirmingReset).toBe(true);
    t.press("confirm");
    expect(t.scene.result).toBe("new");
    expect(t.saved()).toBe(false);
  });
});
