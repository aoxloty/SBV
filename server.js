require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// Cấu hình đọc file tĩnh từ thư mục public (success.html nằm ở đây)
app.use(express.static('public'));

// Sử dụng cookie/session để lưu trạng thái OAuth2
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'random_secret_string',
    resave: false,
    saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.send('Server Linked Roles is running. Please go to /auth/login to start the OAuth2 process with Discord.');
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
        return res.status(403).send('❌ Error: Invalid state parameter. Please try again.');
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

        if (!response.ok) throw new Error(tokens.error_description || 'Cannot fetch access token');

        // Đẩy dữ liệu Metadata (Linked Role) lên Discord cho User này
        await updateMetadata(tokens.access_token);

        // ĐÃ THAY THẾ: Trả về file success.html của bạn thay vì chữ thuần túy
        res.sendFile(__dirname + '/public/success.html');

    } catch (error) {
        console.error(error);
        res.status(500).send('❌ An error occurred during the OAuth2 process.');
    }
});

// Hàm mẫu đẩy metadata lên Discord (Sửa key metadata cho khớp với register-metadata.js của bạn)

const ALLOWED_USERS = ['407183255604035596', '1329632012008689724'];

async function updateMetadata(accessToken) {
    // 1. Lấy thông tin ID người dùng hiện tại từ Discord
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userResponse.json();

    // 2. CHẶN NGƯỜI LẠ: Nếu ID người dùng không nằm trong mảng ALLOWED_USERS
    if (!ALLOWED_USERS.includes(userData.id)) {
        throw new Error('You are not an allowed user!');
    }

    // 3. Nếu hợp lệ, tiến hành ghi đè dữ liệu lên Discord
    const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            platform_name: 'SBV Linked Roles System',
            platform_username: userData.username, // Lấy tên thật của người dùng
            metadata: {
                // Sửa các key dưới đây cho đúng với cấu hình file register-metadata.js của bạn
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