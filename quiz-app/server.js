// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const QRCode = require('qrcode');
const axios = require('axios');

// 导入路由
const apiRoutes = require('./routes/api');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'lean_quiz_secret_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 静态文件
app.use(express.static('public'));

// 初始化数据库（全局单例）
const db = new sqlite3.Database('./database/quiz.db');
// 将db挂载到app，供路由使用
app.set('db', db);

// 初始化表结构和题库（首次启动时）
require('./initDb')(db);

// 路由注册
app.use('/api', apiRoutes);
app.use('/export', exportRoutes);

// 生成二维码API（供管理页调用）
app.get('/api/qrcode', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const quizUrl = `${baseUrl}/`;
    try {
        const qrDataUrl = await QRCode.toDataURL(quizUrl);
        res.json({ qrDataUrl, quizUrl });
    } catch (err) {
        res.status(500).json({ error: '生成二维码失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`精益问答系统运行在 http://localhost:${PORT}`);
    console.log(`访问管理页: http://localhost:${PORT}/admin.html`);
});