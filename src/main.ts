import "./style.css";
import { GAME_HEIGHT, GAME_WIDTH } from "./core/config";
import { startLoop } from "./core/loop";
import { Renderer } from "./core/renderer";
import { SPRITES } from "./data/sprites";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Không tìm thấy #game trong index.html");

const renderer = new Renderer(canvas);
renderer.sprites.definePixels("clock", SPRITES.clock);

// Màn hình tạm của skeleton: tên game + bộ đếm tick để xác nhận vòng lặp đang chạy.
let tick = 0;

startLoop({
  update() {
    tick++;
  },
  render() {
    const cx = GAME_WIDTH / 2;
    renderer.clear("#14110f");
    renderer.sprite("clock", cx - 4, GAME_HEIGHT / 2 - 46);
    renderer.text("Still Hours", cx, GAME_HEIGHT / 2 - 28, { size: 24, align: "center", color: "#d8c9a3" });
    renderer.text(`tick: ${tick}`, cx, GAME_HEIGHT / 2 + 8, { size: 12, align: "center", color: "#8a7f68" });
  },
});
