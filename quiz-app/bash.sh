# 项目结构
quiz-app/
├── server.js                # 后端服务入口
├── package.json             # 依赖配置
├── initDb.js                # 数据库初始化与题库解析
├── routes/
│   ├── api.js               # API路由
│   └── export.js            # 导出路由
├── middleware/
│   └── auth.js              # 微信授权与用户识别
├── public/
│   ├── index.html           # 答题主页面
│   ├── admin.html           # 管理页面（二维码/导出）
│   └── style.css            # 样式文件
└── database/
    └── quiz.db              # SQLite数据库（自动生成）