require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// Sử dụng cookie/session để lưu trạng thái OAuth2
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'random_secret_string',
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.send('✅ Server Linked Roles đang hoạt động ổn định!');
});

// --- 1. ROUTE XỬ LÝ KHI USER BẤM LIÊN KẾT ROLE TRÊN DISCORD ---
app.get('/auth/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.state = state;

    // Tạo URL dẫn tới trang ủy quyền của Discord
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID);
    url.searchParams.set('redirect_uri', `${process.env.BASE_URL}/api/oauth/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify role_connections.write');
    url.searchParams.set('state', state);

    res.redirect(url.toString());
});

// --- 2. ROUTE CALLBACK NHẬN CODE TỪ DISCORD ---
app.get('/api/oauth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (state !== req.session.state) {
        return res.status(403).send('❌ Lỗi xác thực State không khớp!');
    }

    try {
        // Đổi code lấy Access Token
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${process.env.BASE_URL}/api/oauth/callback`,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokens = await response.json();
        
        if (!response.ok) throw new Error(tokens.error_description || 'Không lấy được token');

        // Đẩy dữ liệu Metadata (Linked Role) lên Discord cho User này
        await updateMetadata(tokens.access_token);

        res.send('🎉 Chúc mừng! Bạn đã liên kết tài khoản thành công. Hãy quay lại Discord để kiểm tra Role.');
    } catch (error) {
        console.error(error);
        res.status(500).send('❌ Có lỗi xảy ra trong quá trình OAuth2.');
    }
});

// Hàm mẫu đẩy metadata lên Discord (Sửa key metadata cho khớp với register-metadata.js của bạn)
async function updateMetadata(accessToken) {
    const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            platform_name: 'Hệ thống SBV',
            platform_username: 'Người dùng hệ thống',
            metadata: {
                // Ví dụ: key của bạn đăng ký trong register-metadata.js là gì thì điền vào đây
                // level: 100,
                // is_vip: true
            },
        }),
    });
    return response.json();
}

app.listen(PORT, () => {
    console.log('\n📝 Hướng dẫn thiết lập:');
    console.log('1. Chạy "node register-metadata.js" để đăng ký metadata với Discord');
    console.log('2. Đặt Linked Roles Verification URL trong Discord Developer Portal:');
    console.log(`   -> ${process.env.BASE_URL || 'https://yourapp.com'}/auth/login`);
    console.log('3. Cấu hình role trong Server Settings -> Roles -> Links\n');
});