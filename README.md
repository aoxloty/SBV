# 🤖 Discord Linked Roles Bot

Bot Discord tích hợp Linked Roles — tự động gán role cho thành viên dựa trên dữ liệu từ hệ thống của bạn.

---

## 📁 Cấu trúc project

```
discord-linked-roles-bot/
├── src/
│   ├── server.js            # Server chính (Express)
│   ├── discord.js           # Discord API helpers
│   ├── database.js          # Lưu trữ token & user data
│   └── register-metadata.js # Đăng ký metadata (chạy 1 lần)
├── .env.example             # Mẫu biến môi trường
├── package.json
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt

### Bước 1 — Tạo Discord Application

1. Vào [discord.com/developers/applications](https://discord.com/developers/applications)
2. Nhấn **New Application** → đặt tên
3. Vào tab **Bot** → nhấn **Add Bot** → copy `BOT TOKEN`
4. Vào tab **OAuth2** → copy `CLIENT ID` và `CLIENT SECRET`
5. Trong **OAuth2 → Redirects** → thêm:
   ```
   https://yourapp.com/auth/callback
   ```

### Bước 2 — Cấu hình môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abcdefghij...
DISCORD_BOT_TOKEN=MTIz...
BASE_URL=https://yourapp.com
SESSION_SECRET=random-secret-string-here
PORT=3000
```

### Bước 3 — Cài đặt dependencies

```bash
npm install
```

### Bước 4 — Đăng ký metadata

> Chỉ cần chạy một lần, hoặc khi thay đổi metadata.

```bash
npm run register
```

Kết quả thành công:
```
✅ Đăng ký metadata thành công!
📋 Các metadata đã đăng ký:
   - [level] Cấp độ (type: 2)
   - [is_verified] Đã xác minh (type: 7)
   - [post_count] Số bài viết (type: 2)
```

### Bước 5 — Cấu hình Linked Roles trong Discord Developer Portal

1. Vào **General Information** của application
2. Tìm **Linked Roles Verification URL**
3. Điền: `https://yourapp.com/auth/login`
4. Nhấn **Save Changes**

### Bước 6 — Khởi động server

```bash
npm start
# hoặc để dev với auto-reload:
npm run dev
```

### Bước 7 — Cấu hình Role trong Server Discord

1. Vào **Server Settings → Roles**
2. Chọn role muốn liên kết → tab **Links**
3. Nhấn **Add requirement** → chọn app của bạn
4. Đặt điều kiện, ví dụ: `Cấp độ >= 5`
5. Lưu lại

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/` | Trang hướng dẫn |
| `GET` | `/auth/login` | Bắt đầu OAuth2 |
| `GET` | `/auth/callback` | Discord redirect callback |
| `POST` | `/api/update-metadata` | Cập nhật metadata user |
| `GET` | `/health` | Health check |

### Cập nhật metadata thủ công

```bash
curl -X POST https://yourapp.com/api/update-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "discordUserId": "123456789",
    "metadata": {
      "level": 10,
      "is_verified": 1,
      "post_count": 150
    }
  }'
```

---

## 🛠️ Tuỳ chỉnh

### Thêm metadata mới

Chỉnh sửa mảng `metadata` trong `src/register-metadata.js`, sau đó chạy lại:
```bash
npm run register
```

### Kết nối database thực

Thay thế các hàm trong `src/database.js` bằng queries đến PostgreSQL, MongoDB, v.v.

---

## 🌐 Deploy

### Railway (khuyến nghị cho beginners)
1. Push code lên GitHub
2. Tạo project mới trên [railway.app](https://railway.app)
3. Kết nối repo → Railway tự deploy
4. Thêm các biến môi trường trong Settings

### Render
1. Tạo **Web Service** mới trên [render.com](https://render.com)
2. Kết nối GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`

### Test local với ngrok
```bash
npx ngrok http 3000
# Copy URL dạng https://xxxx.ngrok.io
# Dùng URL đó làm BASE_URL trong .env
```

---

## 📌 Lưu ý quan trọng

- **Bảo mật endpoint** `/api/update-metadata` bằng API key trong production
- **Dùng database thực** (PostgreSQL/Redis) thay vì lưu trong memory
- Token Discord có thể hết hạn — code đã xử lý auto-refresh
- HTTPS bắt buộc trong production (Discord không chấp nhận HTTP)
