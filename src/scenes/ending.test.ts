import { describe, expect, it, vi } from "vitest";
import { GAME_WIDTH, TICK_RATE } from "../core/config";
import { formatPlayTime } from "../core/format";
import { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { CREDITS, ENDING_LINE } from "../data/credits";
import { DIALOGUES } from "../data/dialogues";
import { ENDING_FEEL, TOWN_FEEL } from "../data/flow-feel";
import { FakeAudio } from "../testing/sim";
import { EndingScene, endingAnchors, endingCameraX } from "./ending";

const WORLD_WIDTH = 2048;
const PLAY_SECONDS = 1361.4;

function rig() {
  const input = new Input();
  const audio = new FakeAudio(5, 0.03);
  const clear = vi.fn();
  const scene = new EndingScene({ worldWidth: WORLD_WIDTH, drawWorld: () => undefined }, input, audio, { clear }, PLAY_SECONDS);
  const tick = (confirm = false): void => {
    input.setActionState("test", "confirm", confirm);
    input.poll();
    scene.update();
    audio.t += 1 / TICK_RATE;
  };
  /** Chạy tới khi vào pha `phase` (không bấm gì). */
  const toPhase = (phase: typeof scene.phase): void => {
    for (let i = 0; i < 100000 && scene.phase !== phase; i++) tick();
  };
  return { audio, scene, clear, tick, toPhase };
}

function textsOf(scene: EndingScene): string[] {
  const texts: string[] = [];
  const renderer = {
    clear: () => undefined,
    text: (content: string) => texts.push(content),
    rect: () => undefined,
    setAlpha: () => undefined,
  } as unknown as Renderer;
  scene.render(renderer);
  return texts;
}

describe("endingCameraX", () => {
  it("đều từ điểm đầu tới điểm cuối, kẹp ở hai đầu", () => {
    expect(endingCameraX(0, 40, 1408, 0)).toBe(1408);
    expect(endingCameraX(20, 40, 1408, 0)).toBe(704);
    expect(endingCameraX(40, 40, 1408, 0)).toBe(0);
    expect(endingCameraX(-3, 40, 1408, 0)).toBe(1408);
    expect(endingCameraX(99, 40, 1408, 0)).toBe(0);
  });
});

describe("endingAnchors", () => {
  it("năm mốc từ đông sang tây: cửa tháp rồi r4, r3, r2, r1", () => {
    const anchors = endingAnchors(TOWN_FEEL.tile);
    expect(anchors).toHaveLength(5);
    for (let i = 1; i < anchors.length; i++) expect(anchors[i] as number).toBeLessThan(anchors[i - 1] as number);
  });
});

describe("EndingScene: pha trôi", () => {
  it("camera trôi đều từ tháp về tây, không điều khiển được", () => {
    const r = rig();
    const start = r.scene.cameraX;
    expect(start).toBe(WORLD_WIDTH - GAME_WIDTH);
    let last = start;
    for (let i = 0; i < ENDING_FEEL.driftSeconds * TICK_RATE - 1; i++) {
      r.tick(i % 7 === 0); // bấm lung tung cũng không đổi gì
      expect(r.scene.phase).toBe("drift");
      expect(r.scene.cameraX).toBeLessThanOrEqual(last);
      last = r.scene.cameraX;
    }
    expect(last).toBeLessThan(start * 0.01 + 1);
  });

  it("tích tắc chồng lớp: một lớp ở tháp, thêm một lớp mỗi khi camera đi ngang một cư dân", () => {
    const r = rig();
    r.tick();
    expect(r.scene.layerCount).toBe(1);
    let previous = 1;
    const seen = new Set<number>([1]);
    for (let i = 0; i < ENDING_FEEL.driftSeconds * TICK_RATE - 1; i++) {
      r.tick();
      expect(r.scene.layerCount).toBeGreaterThanOrEqual(previous);
      previous = r.scene.layerCount;
      seen.add(previous);
    }
    expect(previous).toBe(5);
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(r.audio.plays.length).toBeGreaterThan(40);
  });
});

describe("EndingScene: thẻ thời gian", () => {
  it("mờ đen xong thì hiện thời gian chơi; 'Vẫn chưa muộn.' hiện sau 2 giây", () => {
    const r = rig();
    r.toPhase("time");
    expect(r.scene.phase).toBe("time");
    expect(textsOf(r.scene)).toEqual([formatPlayTime(PLAY_SECONDS)]);
    expect(formatPlayTime(PLAY_SECONDS)).toBe("22 phút 41 giây");

    for (let i = 0; i < ENDING_FEEL.closingLineAfterSeconds * TICK_RATE - 1; i++) r.tick();
    expect(r.scene.showsClosingLine).toBe(false);
    r.tick();
    expect(r.scene.showsClosingLine).toBe(true);
    expect(textsOf(r.scene)).toEqual([formatPlayTime(PLAY_SECONDS), ENDING_LINE]);
  });

  it("confirm trước 4 giây không làm gì; từ 4 giây thì sang công trạng", () => {
    const r = rig();
    r.toPhase("time");
    const early = ENDING_FEEL.confirmAfterSeconds * TICK_RATE;
    for (let i = 1; i < early - 2; i++) r.tick(i % 5 === 0);
    r.tick(true); // lần bấm cuối trước mốc
    expect(r.scene.phase).toBe("time");
    r.tick(false);
    r.tick(true); // đúng mốc 4 giây
    expect(r.scene.phase).toBe("credits");
  });

  it("không bấm thì giữ mãi trên thẻ thời gian", () => {
    const r = rig();
    r.toPhase("time");
    for (let i = 0; i < 120 * TICK_RATE; i++) r.tick();
    expect(r.scene.phase).toBe("time");
    expect(r.clear).not.toHaveBeenCalled();
  });
});

describe("EndingScene: công trạng và lưu", () => {
  function toCredits() {
    const r = rig();
    r.toPhase("time");
    for (let i = 0; i < ENDING_FEEL.confirmAfterSeconds * TICK_RATE + 2; i++) r.tick();
    r.tick(true);
    expect(r.scene.phase).toBe("credits");
    return r;
  }

  it("tự cuộn hết rồi xóa bản lưu đúng một lần", () => {
    const r = toCredits();
    for (let i = 0; i < ENDING_FEEL.creditsSeconds * TICK_RATE - 1; i++) r.tick();
    expect(r.scene.finished).toBe(false);
    expect(r.clear).not.toHaveBeenCalled();
    r.tick();
    expect(r.scene.finished).toBe(true);
    expect(r.clear).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) r.tick(i % 2 === 0);
    expect(r.clear).toHaveBeenCalledTimes(1);
  });

  it("confirm bỏ qua công trạng, nhưng không ngay giây đầu (khỏi lỡ tay)", () => {
    const early = toCredits();
    early.tick(false);
    early.tick(true);
    expect(early.scene.finished).toBe(false);

    const late = toCredits();
    for (let i = 0; i < ENDING_FEEL.creditsGuardSeconds * TICK_RATE; i++) late.tick();
    late.tick(true);
    expect(late.scene.finished).toBe(true);
    expect(late.clear).toHaveBeenCalledTimes(1);
  });

  it("hết màn thì không còn tiếng nào chưa phát", () => {
    const r = toCredits();
    for (let i = 0; i < ENDING_FEEL.creditsSeconds * TICK_RATE; i++) r.tick();
    expect(r.scene.finished).toBe(true);
    expect(r.audio.plays.filter((p) => !p.cancelled && p.time > r.audio.t)).toEqual([]);
  });
});

describe("Câu 'Vẫn chưa muộn.' chỉ xuất hiện một lần trong cả game", () => {
  it("không nằm trong hội thoại nào, cũng không trong công trạng", () => {
    const phrase = ENDING_LINE.toLowerCase().replace(/[.!]/g, "");
    expect(phrase).toContain("chưa muộn");
    for (const [id, lines] of Object.entries(DIALOGUES)) {
      for (const line of lines) expect(line.text.toLowerCase(), id).not.toContain("chưa muộn");
    }
    for (const line of CREDITS) expect(line.text.toLowerCase()).not.toContain("chưa muộn");
  });
});
