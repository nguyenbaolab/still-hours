import { describe, expect, it } from "vitest";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { PLAYER_FEEL } from "../data/feel";
import { Input } from "../core/input";
import { steer, release } from "../testing/bots";
import { EXIT_FIXTURE } from "../testing/fixtures";
import { FakeAudio, simulate } from "../testing/sim";
import type { ExitFinish } from "../data/pattern-types";
import { DodgePhase } from "./dodge-phase";
import { doorFor, exitView, hasExited } from "./exit";
import { Player } from "./player";

const { arena } = BATTLE_LAYOUT;
const rule = EXIT_FIXTURE.finish as ExitFinish;
const view = (beat: number, carried = 0) => exitView(rule, EXIT_FIXTURE.lengthBeats, beat, carried, arena);
const centerY = arena.y + arena.h / 2;

describe("khe cửa: hàm thuần theo beat", () => {
  it("khe nằm giữa cạnh phải, rộng đúng px", () => {
    const door = doorFor(rule, arena, 28);
    expect(door.side).toBe("right");
    expect((door.from + door.to) / 2).toBeCloseTo(centerY);
    expect(door.to - door.from).toBeCloseTo(28);
  });

  it("vòng 1: đóng, báo 1 beat trước khi mở, mở 2 beat, rồi đóng", () => {
    expect(view(0).open).toBe(false);
    expect(view(0).warn).toBe(false);
    expect(view(2.9).warn).toBe(false);
    expect(view(3.2).warn).toBe(true);
    expect(view(3.2).open).toBe(false);
    expect(view(4).open).toBe(true);
    expect(view(5.9).open).toBe(true);
    expect(view(6).open).toBe(false);
    expect(view(7.5).warn).toBe(false);
  });

  it("rộng dần theo số vòng: 28, 44, 64, rồi giữ 64", () => {
    const width = (beat: number, carried = 0) => {
      const v = view(beat, carried);
      return v.nextDoor.to - v.nextDoor.from;
    };
    expect(width(4)).toBeCloseTo(28);
    expect(width(12)).toBeCloseTo(44);
    expect(width(20)).toBeCloseTo(64);
    expect(width(60)).toBeCloseTo(64);
  });

  it("vòng 2 mở 3 beat; vòng 3 mở tới hết vòng; từ vòng 4 mở ngay từ beat 0", () => {
    expect(view(8 + 4 + 2.9).open).toBe(true);
    expect(view(8 + 4 + 3).open).toBe(false);
    expect(view(16 + 4).open).toBe(true);
    expect(view(16 + 7.9).open).toBe(true);
    expect(view(16).open).toBe(false);
    expect(view(24).open).toBe(true);
    expect(view(24.1).warn).toBe(false);
  });

  it("số vòng mang từ các lần thua cộng vào số vòng đang chơi", () => {
    expect(view(4, 2).nextDoor.to - view(4, 2).nextDoor.from).toBeCloseTo(64);
    expect(view(0, 3).open).toBe(true);
    expect(view(4, 0).loop).toBe(0);
    expect(view(12, 2).loop).toBe(3);
  });

  it("beat âm (dạo đầu): khe đóng", () => {
    expect(view(-1).open).toBe(false);
    expect(view(-1, 5).open).toBe(false);
  });

  it("hasExited: tâm ra khỏi viền ngoài theo từng cạnh", () => {
    expect(hasExited(arena.x + arena.w + 1, centerY, arena, "right")).toBe(true);
    expect(hasExited(arena.x + arena.w - 1, centerY, arena, "right")).toBe(false);
    expect(hasExited(arena.x - 1, centerY, arena, "left")).toBe(true);
    expect(hasExited(arena.x + 5, arena.y - 1, arena, "top")).toBe(true);
    expect(hasExited(arena.x + 5, arena.y + arena.h + 1, arena, "bottom")).toBe(true);
  });
});

describe("Player với khe cửa", () => {
  const pushRight = (player: Player, ticks: number, dy = 0) => {
    for (let i = 0; i < ticks; i++) player.shift(3, dy, arena);
  };

  it("khe đóng: bị kẹp trong khung", () => {
    const player = new Player(PLAYER_FEEL, 18);
    player.place(arena.x + arena.w - 20, centerY);
    pushRight(player, 30);
    expect(player.x).toBeLessThanOrEqual(arena.x + arena.w - 9);
  });

  it("khe mở: lách qua khe được và ra khỏi viền ngoài", () => {
    const player = new Player(PLAYER_FEEL, 18);
    player.door = doorFor(rule, arena, 28);
    player.place(arena.x + arena.w - 20, centerY);
    pushRight(player, 30);
    expect(hasExited(player.x, player.y, arena, "right")).toBe(true);
  });

  it("khe mở nhưng lệch khỏi khe: vẫn bị kẹp ở mép", () => {
    const player = new Player(PLAYER_FEEL, 18);
    player.door = doorFor(rule, arena, 28);
    player.place(arena.x + arena.w - 20, centerY - 40);
    pushRight(player, 30);
    expect(player.x).toBeLessThanOrEqual(arena.x + arena.w - 9);
  });

  it("đã ở ngoài mép: hai bên khe là tường, không trượt ra ngoài khe", () => {
    const player = new Player(PLAYER_FEEL, 18);
    const door = doorFor(rule, arena, 28);
    player.door = door;
    player.place(arena.x + arena.w - 9, centerY);
    pushRight(player, 4);
    for (let i = 0; i < 30; i++) player.shift(0, 3, arena);
    expect(player.y).toBeLessThanOrEqual(door.to - 9 + 1e-9);
  });

  it("khe đóng khi bánh răng đang ở giữa khe: bị đẩy về trong khung", () => {
    const player = new Player(PLAYER_FEEL, 18);
    player.door = doorFor(rule, arena, 28);
    player.place(arena.x + arena.w - 20, centerY);
    pushRight(player, 8);
    expect(player.x).toBeGreaterThan(arena.x + arena.w - 9);
    player.door = null;
    player.shift(0, 0, arena);
    expect(player.x).toBeLessThanOrEqual(arena.x + arena.w - 9);
  });
});

function setup(loopsSeen = 0) {
  const audio = new FakeAudio(5, 0.03);
  const input = new Input();
  const phase = new DodgePhase(input, audio, 18, EXIT_FIXTURE, { loopsSeen });
  return { audio, input, phase, player: phase["player"] };
}

/** Bot đi tới hàng của khe, đứng sát mép; khi khe mở thì đi thẳng ra. */
function exitBot(input: Input, phase: DodgePhase, player: Player): () => void {
  return () => {
    const exit = phase["exit"];
    if (!exit) return release(input);
    const door = exit.nextDoor;
    const y = (door.from + door.to) / 2;
    const x = exit.open ? arena.x + arena.w + 40 : arena.x + arena.w - 9;
    steer(input, x - player.x, y - player.y);
  };
}

describe("DodgePhase: khe cửa", () => {
  it("bánh răng đứng yên giữa khung thì không bao giờ ra, kể cả khi khe mở rồi", () => {
    const { audio, input, phase } = setup(3);
    simulate({
      seconds: 30,
      audio,
      step: () => {
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("playing");
  });

  it("bot canh khe: ra trong vòng 1 (khe 28 px, 2 beat) và thắng", () => {
    const { audio, input, phase, player } = setup();
    const bot = exitBot(input, phase, player);
    simulate({
      seconds: 12,
      audio,
      step: () => {
        bot();
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    expect(phase.loopsSeen).toBe(0);
  });

  it("khe mở sẵn từ vòng 4: bot đi thẳng ra, thắng trước khi qua hết 5 giây", () => {
    const { audio, input, phase, player } = setup(3);
    const bot = exitBot(input, phase, player);
    simulate({
      seconds: 12,
      audio,
      step: () => {
        bot();
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    expect(audio.t - 5).toBeLessThan(5);
  });

  it("vòng đã qua được đếm và cộng với số mang từ lần thua trước", () => {
    const { audio, input, phase } = setup(2);
    simulate({
      seconds: 5 + 4 * 2 + 0.5,
      audio,
      step: () => {
        input.poll();
        phase.update();
      },
    });
    expect(phase.loopsSeen).toBe(2 + Math.floor(phase["clock"].beat / EXIT_FIXTURE.lengthBeats));
    expect(phase.loopsSeen).toBeGreaterThanOrEqual(3);
  });

  it("thắng bằng khe thì pha dọn đạn như `length` rồi outcome là won", () => {
    const { audio, input, phase, player } = setup(3);
    const bot = exitBot(input, phase, player);
    simulate({
      seconds: 12,
      audio,
      step: () => {
        bot();
        input.poll();
        phase.update();
      },
      stopWhen: () => phase.outcome !== "playing",
    });
    expect(phase.outcome).toBe("won");
    expect(phase["stage"]).toBe("clearing");
  });
});