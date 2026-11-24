/**
 * Toàn bộ hội thoại của game, dạng dữ liệu. Câu ≤ 110 ký tự (`DIALOGUE_FEEL.maxChars`), ≤ 2 dòng hộp thoại.
 * Người thợ (người chơi) không bao giờ nói. `narrator` và `note` không hiện tên.
 * Câu "Vẫn chưa muộn." chỉ xuất hiện MỘT lần trong cả game, ở màn kết (không viết ở đây, không dùng cho màn thua).
 */

export type SpeakerId = "narrator" | "note" | "r1" | "r2" | "r3" | "r4" | "boss";

export interface DialogueLine {
  speaker: SpeakerId;
  text: string;
}

/** `name` rỗng = không hiện tên. `blipHz`: cao độ tiếng chữ của người đó. */
export const SPEAKERS: Record<SpeakerId, { name: string; blipHz: number }> = {
  narrator: { name: "", blipHz: 330 },
  note: { name: "", blipHz: 330 },
  r1: { name: "Bác Hòa", blipHz: 196 },
  r2: { name: "Chú Minh", blipHz: 247 },
  r3: { name: "Chị Vân", blipHz: 392 },
  r4: { name: "Linh", blipHz: 523 },
  boss: { name: "Ông Khải", blipHz: 165 },
};

const say = (speaker: SpeakerId, ...texts: string[]): DialogueLine[] => texts.map((text) => ({ speaker, text }));

export const DIALOGUES = {
  introOpening: [
    ...say("narrator", "Thị trấn có một trăm hai mươi bảy chiếc đồng hồ."),
    ...say("narrator", "Một buổi chiều, tất cả cùng dừng ở bốn giờ mười bảy phút."),
    ...say("narrator", "Người ta vẫn đứng đó. Giữa câu nói. Giữa bước chân."),
    ...say("narrator", "Chỉ còn một người thợ sửa đồng hồ."),
  ],
  shopNote: say("note", "Đồng hồ nào cũng mở ra được."),

  officeSign: say("note", "Cơ quan. Giờ làm việc: tới sáu giờ."),
  noticeBoard: say("note", "Giấy dán kín bảng. Tờ nào cũng đã phai."),
  towerSign: say("note", "Tháp đồng hồ. Kim dừng ở bốn giờ mười bảy."),

  r1Open: say("r1", "Thêm một tiếng nữa thôi. Rồi về."),
  r1Close: say("r1", "...Mấy giờ rồi nhỉ."),
  r1Idle: say("r1", "Chuông vẫn đang đổ."),

  r2Open: say("r2", "Trễ rồi, trễ rồi."),
  r2Close: say("r2", "Ở đây... có cây phượng này từ bao giờ?"),
  r2Idle: say("r2", "Ngoài này rộng thật."),

  r3Open: say("r3", "Họ nói đúng mà."),
  r3Close: say("r3", "Mình hát... dở lắm. Nhưng mình thích hát."),
  r3Idle: say("r3", "Hừm... hừm..."),

  r4Open: say("r4", "Mai mình vẽ."),
  r4Close: say("r4", "Xấu thật đấy.", "...Nhưng là của mình."),
  r4Idle: say("r4", "Đang vẽ, đừng nhìn."),

  bossOpen: say("boss", "Cậu cũng tới sửa à. Ta sửa nó suốt bao năm rồi."),
  bossClose: say("boss", "Ta cứ nghĩ còn nhiều thời gian."),
  bossIdle: say("boss", "Ngoài này rộng thật."),
} satisfies Record<string, readonly DialogueLine[]>;

export type DialogueId = keyof typeof DIALOGUES;
