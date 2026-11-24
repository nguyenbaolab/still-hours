# Credits

Asset bên ngoài dùng trong Still Hours. Mọi hình và âm khác đều do mã tạo ra (sprite dạng dữ liệu, âm thanh tổng hợp bằng WebAudio).

## Font

- **VT323** của Peter Hull, giấy phép **SIL Open Font License 1.1**.
  - Tải từ `https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf`; gốc `https://github.com/phoikoi/VT323`.
  - Giấy phép: `public/assets/fonts/OFL.txt` (kèm theo bắt buộc của OFL), cũng ở `https://github.com/google/fonts/raw/main/ofl/vt323/OFL.txt`.
  - Tự host: `public/assets/fonts/VT323-Regular.ttf`; nạp bằng `@font-face` trong `src/style.css`.
  - Có đủ bảng chữ tiếng Việt (subsets `latin`, `latin-ext`, `vietnamese` theo metadata Google Fonts); đã kiểm bảng `cmap` với mọi chuỗi hiển thị trong game (xem DECISIONS.md, mục 7.1).