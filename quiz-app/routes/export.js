// routes/export.js
const express = require('express');
const router = express.Router();
const json2csv = require('json2csv').parse;
const fs = require('fs');
const path = require('path');

// 简单验证（可自行修改密钥）
const ADMIN_SECRET = 'lean2026';

router.get('/excel', (req, res) => {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) {
        return res.status(403).send('无权访问');
    }
    
    const db = req.app.get('db');
    db.all("SELECT serial_no, openid, score, submit_time, answers FROM user_records ORDER BY serial_no ASC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const csvData = rows.map(row => ({
            序号: row.serial_no,
            用户标识: row.openid,
            得分: row.score,
            提交时间: row.submit_time,
            答题详情: row.answers
        }));
        
        const csv = json2csv(csvData);
        res.header('Content-Type', 'text/csv');
        res.attachment(`quiz_records_${new Date().toISOString().slice(0,19)}.csv`);
        res.send(csv);
    });
});

module.exports = router;