/**
 * discord.js
 * Các hàm tiện ích để tương tác với Discord API
 */

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL;

const REDIRECT_URI = `${BASE_URL}/auth/callback`;
const SCOPES = ['identify', 'role_connections.write'];

// ─────────────────────────────────────────────
// OAuth2 Helpers
// ─────────────────────────────────────────────

/**
 * Tạo URL để redirect user đến trang đăng nhập Discord
 */
function getOAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: state,
    scope: SCOPES.join(' '),
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

/**
 * Đổi authorization code lấy access token
 */
async function getOAuthTokens(code) {
  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lỗi lấy OAuth tokens: ${JSON.stringify(error)}`);
  }
  return response.json();
}

/**
 * Làm mới access token khi hết hạn
 */
async function refreshOAuthTokens(refreshToken) {
  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lỗi refresh token: ${JSON.stringify(error)}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────
// User Info
// ─────────────────────────────────────────────

/**
 * Lấy thông tin user từ Discord
 */
async function getDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Không thể lấy thông tin user Discord');
  }
  return response.json();
}

// ─────────────────────────────────────────────
// Role Connection Metadata
// ─────────────────────────────────────────────

/**
 * Đẩy metadata lên Discord để cập nhật trạng thái role connection
 * @param {string} accessToken - OAuth2 access token của user
 * @param {object} metadata - Object chứa các key/value metadata
 * @param {string} platformUsername - Tên hiển thị trên Discord role panel
 */
async function pushMetadata(accessToken, metadata, platformUsername) {
  const response = await fetch(
    `https://discord.com/api/v10/users/@me/applications/${CLIENT_ID}/role-connection`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform_name: 'MyApp', // ✏️ Đổi tên app của bạn ở đây
        platform_username: platformUsername,
        metadata,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lỗi push metadata: ${JSON.stringify(error)}`);
  }
  return response.json();
}

module.exports = {
  getOAuthUrl,
  getOAuthTokens,
  refreshOAuthTokens,
  getDiscordUser,
  pushMetadata,
};
