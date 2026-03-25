/**
 * server.js
 * Server chính xử lý OAuth2 và Linked Roles
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const discord = require('./discord');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 10, // 10 phút
    },
  })
);

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

/**
 * GET /
 * Trang chủ — hướng dẫn người dùng
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Discord Linked Roles</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 80px auto; padding: 0 20px; }
        .btn { display:inline-block; background:#5865F2; color:#fff; padding:12px 24px;
               border-radius:8px; text-decoration:none; font-size:16px; }
        .btn:hover { background:#4752c4; }
        code { background:#f0f0f0; padding:2px 6px; border-radius:4px; }
      </style>
    </head>
    <body>
      <h1>🤖 Discord Linked Roles Bot</h1>
      <p>Nhấn nút bên dưới để xác minh tài khoản và nhận role trên Discord.</p>
      <a class="btn" href="/auth/login">🔗 Xác minh với Discord</a>
      <hr style="margin:40px 0">
      <h3>API Endpoints:</h3>
      <ul>
        <li><code>GET /auth/login</code> — Bắt đầu OAuth2 flow</li>
        <li><code>GET /auth/callback</code> — Discord redirect về đây</li>
        <li><code>POST /api/update-metadata</code> — Cập nhật metadata thủ công</li>
        <li><code>GET /health</code> — Health check</li>
      </ul>
    </body>
    </html>
  `);
});

/**
 * GET /auth/login
 * Bắt đầu quá trình OAuth2 — redirect user đến Discord
 */
app.get('/auth/login', (req, res) => {
  // Tạo state ngẫu nhiên để chống CSRF
  const state = crypto.randomUUID();
  req.session.oauthState = state;

  const authUrl = discord.getOAuthUrl(state);
  console.log(`🔐 Bắt đầu OAuth2 flow, state: ${state}`);
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Discord redirect về đây sau khi user đăng nhập
 */
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Kiểm tra state để chống CSRF
  if (!state || state !== req.session.oauthState) {
    return res.status(403).send('❌ Lỗi xác thực: state không hợp lệ.');
  }
  delete req.session.oauthState;

  if (!code) {
    return res.status(400).send('❌ Không nhận được authorization code.');
  }

  try {
    // 1. Đổi code lấy tokens
    const tokens = await discord.getOAuthTokens(code);
    console.log('✅ Đã lấy được OAuth tokens');

    // 2. Lấy thông tin user Discord
    const discordUser = await discord.getDiscordUser(tokens.access_token);
    console.log(`👤 User: ${discordUser.username} (${discordUser.id})`);

    // 3. Lưu tokens vào DB
    db.saveTokens(discordUser.id, tokens);

    // 4. Lấy dữ liệu user từ hệ thống của bạn
    const userData = db.getUserData(discordUser.id);

    // 5. Đẩy metadata lên Discord
    await discord.pushMetadata(
      tokens.access_token,
      {
        level: userData.level,
        is_verified: userData.is_verified ? 1 : 0,
        post_count: userData.post_count,
      },
      userData.username || discordUser.username
    );

    console.log(`🎉 Đã cập nhật role connection cho ${discordUser.username}`);

    // 6. Trả về trang thành công
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Xác minh thành công!</title>
        <style>
          body { font-family: sans-serif; max-width: 500px; margin: 80px auto; text-align:center; }
          .icon { font-size: 64px; }
          .name { color: #5865F2; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="icon">✅</div>
        <h1>Xác minh thành công!</h1>
        <p>Xin chào <span class="name">${discordUser.username}</span>!</p>
        <p>Tài khoản của bạn đã được liên kết. Quay lại Discord để kiểm tra role.</p>
        <p><small>Level: ${userData.level} | Verified: ${userData.is_verified ? 'Yes' : 'No'}</small></p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ Lỗi trong callback:', err.message);
    res.status(500).send(`❌ Đã xảy ra lỗi: ${err.message}`);
  }
});

/**
 * POST /api/update-metadata
 * Cập nhật metadata cho một user cụ thể (gọi từ hệ thống nội bộ của bạn)
 * 
 * Body: { discordUserId: "123...", metadata: { level: 5, is_verified: 1, post_count: 42 } }
 */
app.post('/api/update-metadata', async (req, res) => {
  // ✏️ Thêm authentication cho endpoint này trong production!
  const { discordUserId, metadata } = req.body;

  if (!discordUserId || !metadata) {
    return res.status(400).json({ error: 'Thiếu discordUserId hoặc metadata' });
  }

  try {
    let tokens = db.getTokens(discordUserId);

    if (!tokens) {
      return res.status(404).json({ error: 'User chưa xác thực' });
    }

    // Làm mới token nếu hết hạn
    if (db.isTokenExpired(discordUserId)) {
      console.log(`🔄 Đang refresh token cho user ${discordUserId}...`);
      const newTokens = await discord.refreshOAuthTokens(tokens.refreshToken);
      db.saveTokens(discordUserId, newTokens);
      tokens = db.getTokens(discordUserId);
    }

    // Lấy username từ DB
    const userData = db.getUserData(discordUserId);

    // Cập nhật metadata
    await discord.pushMetadata(tokens.accessToken, metadata, userData.username);

    // Lưu metadata mới vào DB
    db.saveUserData(discordUserId, metadata);

    console.log(`✅ Đã cập nhật metadata cho user ${discordUserId}`);
    res.json({ success: true, discordUserId, metadata });
  } catch (err) {
    console.error('❌ Lỗi cập nhật metadata:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clientId: process.env.DISCORD_CLIENT_ID ? '✅ Đã cấu hình' : '❌ Chưa cấu hình',
    baseUrl: process.env.BASE_URL || 'Chưa cấu hình',
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n🤖 Discord Linked Roles Bot đang chạy!');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔗 Verify URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/auth/login`);
  console.log('\n📋 Hướng dẫn thiết lập:');
  console.log('   1. Chạy "npm run register" để đăng ký metadata với Discord');
  console.log('   2. Đặt Linked Roles Verification URL trong Discord Developer Portal:');
  console.log(`      → ${process.env.BASE_URL || 'https://yourapp.com'}/auth/login`);
  console.log('   3. Cấu hình role trong Server Settings → Roles → Links\n');
});
