# Hệ thống sự kiện của trận

Nền cho task nối (nhân vật hướng dẫn). Trận **chỉ phát** sự kiện; không có giao diện hay nhân vật nào ở đây. Code:
`src/core/game-events.ts`. Nghe hay không nghe thì game chạy y hệt (phát sự kiện không bao giờ đổi trạng thái game).

## Định nghĩa "điểm"

Game trước đây không có điểm số. Định nghĩa dùng cho sự kiện `score` (số ở `HUD_FEEL.points`, `src/data/hud-feel.ts`):

| Việc | Điểm |
| ---- | ---- |
| Tháo xong một bộ phận (pha tháo) | `points.part` = 10 |
| Pha né qua một mốc tiến độ 25% / 50% / 75% (`HUD_FEEL.milestones`) | `points.milestone` = 5 mỗi mốc |

Tổng điểm là của **một trận** (một cư dân), bắt đầu từ 0 khi `BattleScene` được dựng và cộng dồn qua cả ba lượt, kể cả lượt
chơi lại sau khi thua (mốc đã qua ở lần trước được tính lại ở lần chơi lại vì người chơi đi lại đoạn đó; riêng boss mang số vòng đã qua sang lần chơi lại thì các mốc dưới mức đó không tính lại). Game **không hiện**
điểm; điểm chỉ để người nghe sự kiện dùng. Sao (1..3 cho mỗi lượt) tính riêng, theo máu còn lại lúc thắng pha né.

## Năm sự kiện

Tên là hằng số `GAME_EVENTS` (`score`, `mistake`, `nearWin`, `stuck`, `clear`); kiểu tên `GameEventName`; payload có kiểu theo
từng tên qua `GameEventMap`. Các sự kiện của pha có chung `BattlePlace`:

```ts
interface BattlePlace {
  resident: "r1" | "r2" | "r3" | "r4" | "boss" | null; // null khi pha chạy ngoài BattleScene (test, pattern thử)
  round: number;                                       // lượt 1..3 (pha tháo: tầng, trùng với lượt)
  phase: "dodge" | "disassemble";
}
```

### `score`: ghi điểm

Phát khi **tháo xong một bộ phận** (pha tháo, ngay lúc bộ phận rời) hoặc khi **pha né qua một mốc tiến độ**.

| Trường | Ý nghĩa |
| ------ | ------- |
| `reason` | `"part"` hoặc `"milestone"` |
| `points` | điểm của lần này (10 hoặc 5) |
| `total` | tổng điểm của trận tới lúc này |
| `detail` | `part`: id bộ phận (`"core"` cũng chỉ là id thường, xem `Part.core`). `milestone`: mốc vừa qua (0.25, 0.5, 0.75) |

### `mistake`: làm sai

| `kind` | Khi nào | Trường kèm |
| ------ | ------- | ---------- |
| `"hit"` | pha né: bánh răng vừa mất máu vì đạn (không phát lúc đang bất tử; đạn chữ và xao nhãng không trừ máu nên không phát) | `damage`, `hp` (còn lại), `maxHp` |
| `"off-beat"` | pha tháo: bấm Z lệch nhịp ở máy có nhịp (có tiếng cạch) | |
| `"blocked"` | pha tháo: bấm bộ phận còn bị bộ phận khác chặn | |

### `nearWin`: gần thắng

Một lần cho mỗi lần chơi một pha, khi tiến độ của pha đạt `HUD_FEEL.nearWinFraction` (0,75). Pha né thua rồi chơi lại thì
phát lại ở lần chơi lại. Trường kèm: `progress` (0..1), và với pha né `hp`, `maxHp`. Tiến độ tính như thanh tiến độ trên màn:

- pha né `length`: beat nghe được / `lengthBeats`; `page` (Linh): số beat đã vẽ / `drawBeats` hoặc đồng hồ tự khép trang, cái nào
  xa hơn; `exit` (boss): số vòng đã qua (kể cả lần thua trước) / số vòng khe cửa mở hẳn;
- pha tháo: (bộ phận đã tháo của tầng + phần lẻ của thao tác đang làm) / số bộ phận của tầng.

### `stuck`: kẹt lâu

| `reason` | Khi nào |
| -------- | ------- |
| `"losses"` | pha né: người chơi đã thua `amount` lần ở cùng một lượt, từ lần thứ `HUD_FEEL.stuckAfterLosses` (3). Phát lại mỗi lần thua tiếp theo (`amount` tăng). Số lần thua về 0 khi sang lượt |
| `"idle"` | pha tháo: `amount` giây nghe được không có tiến bộ nào (không tháo xong bộ phận, không vặn thêm nấc, không đang giữ nhấc, không đang đọc ký ức), từ `HUD_FEEL.idleSeconds` (12). Phát lại mỗi chừng đó giây cho tới khi có tiến bộ. Kèm `partId` là bộ phận đang chọn |

Số lần thua chỉ được dùng để gợi ý và phát `stuck`; game vẫn không hiện nó ở đâu (đúng CLAUDE.md, mục "Thua").

### `clear`: qua màn

| `scope` | Khi nào | Trường kèm |
| ------- | ------- | ---------- |
| `"round"` | vừa thắng pha né của một lượt (`round` 1..3) | `stars` (1..3), `hp`, `maxHp` |
| `"battle"` | vừa tháo xong tầng 3, ngay trước hội thoại khép trận | `stars` (tổng, 3..9), `starsByRound`, `score` (tổng điểm của trận) |

Sao theo máu còn lại lúc thắng (`HUD_FEEL.stars`): từ 75% máu tối đa trở lên được 3 sao, từ 40% được 2 sao, còn lại 1 sao.
Thắng luôn có ít nhất 1 sao. Máu tối đa theo cư dân (`ResidentData.hp`, xem `docs/balance.md`), nên sao tính theo tỉ lệ.

## API

```ts
import { gameEvents, GAME_EVENTS, GameEvents } from "../core/game-events";

// Đăng ký: trả về hàm hủy.
const stop = gameEvents.on("mistake", (e) => {
  if (e.kind === "hit" && e.hp !== undefined && e.maxHp !== undefined && e.hp / e.maxHp < 0.3) {
    // máu sắp cạn
  }
});
stop(); // hủy (gọi lần hai không sao)

// Hủy theo (tên, handler).
const onScore = (e: GameEventMap["score"]) => console.log(e.total);
gameEvents.on(GAME_EVENTS.score, onScore);
gameEvents.off(GAME_EVENTS.score, onScore);

// Nghe một lần.
gameEvents.once("clear", (e) => { if (e.scope === "battle") console.log("xong trận", e.stars, "sao"); });

// Bộ phát riêng (test, hoặc một trận cô lập): truyền vào BattleScene qua tuỳ chọn cuối.
const events = new GameEvents();
new BattleScene(resident, input, audio, factory, measure, 0, { events });
```

Quy tắc:

- `on` trả về hàm hủy; cùng một handler đăng ký hai lần cho cùng tên chỉ nghe một lần.
- Đăng ký hoặc hủy **trong lúc đang phát** chỉ có tác dụng từ lần phát sau.
- Handler ném lỗi thì ghi `console.error` và các handler còn lại vẫn chạy; game không hỏng.
- `emit` chạy đồng bộ, trong tick của game. Handler nên nhẹ (đặt cờ, đẩy vào hàng đợi), không dựng cảnh hay chờ.
- `listenerCount(name?)` và `clear(name?)` để dọn khi rời cảnh.
- Các pha (`DodgePhase`, `DisassemblePhase`) nhận `RoundContext` (`src/battle/progress.ts`) chứa bộ phát; không truyền thì dùng
  `gameEvents` dùng chung với `resident: null` (`soloContext`).

## Điểm phát trong code

| Sự kiện | Nơi phát |
| ------- | -------- |
| `score` (milestone), `nearWin` (né), `mistake` (hit) | `DodgePhase.trackProgress` / `emitMistake` (`src/battle/dodge-phase.ts`) |
| `score` (part), `mistake` (off-beat, blocked), `nearWin` (tháo), `stuck` (idle) | `DisassemblePhase.apply` / `trackProgress` (`src/battle/disassemble-phase.ts`) |
| `stuck` (losses), `clear` | `BattleScene.watchOutcome` / `advance` (`src/scenes/battle-scene.ts`) |

Test: `src/core/game-events.test.ts` (bộ phát), `src/battle/battle-events.test.ts` (điểm phát của hai pha),
`src/scenes/battle-scene.test.ts` (`clear`, `stuck`, ngữ cảnh), `src/battle/progress.test.ts` (tiến độ, sao, gợi ý).
