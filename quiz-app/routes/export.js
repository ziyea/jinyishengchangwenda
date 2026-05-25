// routes/export.js
const express = require('express');
const router = express.Router();

// 简单验证（可自行修改密钥）
const ADMIN_SECRET = 'lean2026';

function toCSV(rows) {
    if (!rows.length) return '﻿序号,姓名,工号,得分,提交时间,答题详情\n';
    const headers = ['序号', '姓名', '工号', '得分', '提交时间', '答题详情'];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
        csvRows.push([r.serial_no, r.name, r.employee_id, r.score, r.submit_time, r.answers]
            .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    }
    return '﻿' + csvRows.join('\n');
}

router.get('/excel', (req, res) => {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) {
        return res.status(403).send('无权访问');
    }

    const db = req.app.get('db');
    db.all("SELECT serial_no, name, employee_id, score, submit_time, answers FROM user_records ORDER BY serial_no ASC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const csv = toCSV(rows);
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`quiz_records_${new Date().toISOString().slice(0,19)}.csv`);
        res.send(csv);
    });
});

module.exports = router;