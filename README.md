# Still Hours

Game web 2D lấy cảm hứng từ Undertale: bạn là thợ sửa đồng hồ cuối cùng của một thị trấn mà thời gian ngừng chảy, và thay vì đánh, bạn mở máy móc của từng cư dân ra để chạm vào khoảnh khắc họ bị kẹt lại.

Vite + TypeScript + Canvas 2D, deploy lên Cloudflare Workers (Static Assets). Chi tiết thiết kế và quy ước: xem [CLAUDE.md](CLAUDE.md).

## Chạy

```sh
npm install
npm run dev        # dev server có hot reload
npm run build      # kiểm tra kiểu + build ra dist/
npm run preview    # xem bản build
```

Muốn thử bằng runtime Workers giống production: `npm run build && npx wrangler dev`.

## Deploy

```sh
npx wrangler login   # chỉ cần lần đầu
npm run deploy       # build rồi wrangler deploy
```
