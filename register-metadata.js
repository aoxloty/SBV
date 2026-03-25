/**
 * register-metadata.js
 * Chạy script này MỘT LẦN để đăng ký metadata với Discord API.
 * Lệnh: node src/register-metadata.js
 */

require('dotenv').config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// ==============================================================
// ✏️  CHỈNH SỬA CÁC METADATA THEO NHU CẦU CỦA BẠN Ở ĐÂY
// ==============================================================
// Các type hợp lệ:
//   1 = integer_less_than_or_equal
//   2 = integer_greater_than_or_equal
//   3 = integer_equal
//   4 = integer_not_equal
//   5 = datetime_less_than_or_equal
//   6 = datetime_greater_than_or_equal
//   7 = boolean_equal
//   8 = boolean_not_equal
// ==============================================================

const metadata = [
  {
    key: 'level',
    name: 'Cấp độ',
    description: 'Cấp độ tài khoản trên hệ thống',
    type: 2, // integer_greater_than_or_equal
  },
  {
    key: 'is_verified',
    name: 'Đã xác minh',
    description: 'Tài khoản đã hoàn thành xác minh',
    type: 7, // boolean_equal
  },
  {
    key: 'post_count',
    name: 'Số bài viết',
    description: 'Tổng số bài viết đã đăng',
    type: 2, // integer_greater_than_or_equal
  },
];

async function registerMetadata() {
  console.log('🚀 Đang đăng ký metadata với Discord...\n');

  if (!CLIENT_ID || !BOT_TOKEN) {
    console.error('❌ Thiếu DISCORD_CLIENT_ID hoặc DISCORD_BOT_TOKEN trong file .env');
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/applications/${CLIENT_ID}/role-connections/metadata`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Discord API lỗi: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('✅ Đăng ký metadata thành công!');
    console.log('📋 Các metadata đã đăng ký:');
    result.forEach((m) => {
      console.log(`   - [${m.key}] ${m.name} (type: ${m.type})`);
    });
    console.log('\n👉 Bây giờ bạn có thể khởi động server: npm start');
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký metadata:', err.message);
    process.exit(1);
  }
}

registerMetadata();
