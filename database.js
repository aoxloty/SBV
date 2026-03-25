/**
 * database.js
 * 
 * Module giả lập database để lưu trữ token và dữ liệu user.
 * 
 * ✏️ THAY THẾ bằng database thực (PostgreSQL, MongoDB, SQLite...)
 * trong môi trường production.
 */

// Lưu trữ trong memory (mất khi restart server)
const tokenStore = new Map();
const userDataStore = new Map();

// ─────────────────────────────────────────────
// Token Storage
// ─────────────────────────────────────────────

/**
 * Lưu Discord OAuth tokens của user
 */
function saveTokens(discordUserId, tokens) {
  tokenStore.set(discordUserId, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  console.log(`💾 Đã lưu token cho user: ${discordUserId}`);
}

/**
 * Lấy tokens của user
 */
function getTokens(discordUserId) {
  return tokenStore.get(discordUserId) || null;
}

/**
 * Kiểm tra token còn hạn không
 */
function isTokenExpired(discordUserId) {
  const tokens = getTokens(discordUserId);
  if (!tokens) return true;
  return Date.now() >= tokens.expiresAt - 60000; // buffer 60s
}

// ─────────────────────────────────────────────
// User Data Storage
// ─────────────────────────────────────────────

/**
 * Lưu hoặc cập nhật dữ liệu user trong hệ thống của bạn
 */
function saveUserData(discordUserId, data) {
  const existing = userDataStore.get(discordUserId) || {};
  userDataStore.set(discordUserId, { ...existing, ...data });
}

/**
 * Lấy dữ liệu user — trả về dữ liệu mẫu nếu chưa có
 * 
 * ✏️ Thay thế hàm này bằng query database thực của bạn
 */
function getUserData(discordUserId) {
  if (!userDataStore.has(discordUserId)) {
    // Dữ liệu mẫu — thay bằng dữ liệu thực từ DB của bạn
    return {
      username: `user_${discordUserId.slice(-4)}`,
      level: 1,
      is_verified: false,
      post_count: 0,
    };
  }
  return userDataStore.get(discordUserId);
}

/**
 * Liệt kê tất cả user IDs đang có token
 */
function getAllUserIds() {
  return Array.from(tokenStore.keys());
}

module.exports = {
  saveTokens,
  getTokens,
  isTokenExpired,
  saveUserData,
  getUserData,
  getAllUserIds,
};
