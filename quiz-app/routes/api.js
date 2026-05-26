// routes/api.js
const express = require('express');
const router = express.Router();
const { getUserIdentifier } = require('../middleware/auth');

// 获取随机10题（首次或未完成时）
router.get('/random-questions', getUserIdentifier, (req, res) => {
    const db = req.app.get('db');
    const openid = req.userId;
    
    // 检查是否已经完成答题
    db.get("SELECT * FROM user_records WHERE openid = ?", [openid], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (record) {
            return res.json({ status: 'completed', score: record.score });
        }
        
        // 检查是否有未完成的会话
        db.get("SELECT * FROM temp_sessions WHERE openid = ?", [openid], (err, session) => {
            if (err) return res.status(500).json({ error: err.message });
            if (session) {
                const questions = JSON.parse(session.questions);
                return res.json({ status: 'pending', questions });
            }
            
            // 必考题 IDs (db: 251=s101, 252=s102, 254=j101)
            const MANDATORY_IDS = [251, 252, 254];
            // 先取所有必考题
            db.all("SELECT * FROM questions WHERE id IN (" + MANDATORY_IDS.join(',') + ")", (err, mandatory) => {
                if (err) return res.status(500).json({ error: err.message });
                const manSingle = mandatory.filter(q => q.type === 'single');
                const manJudge = mandatory.filter(q => q.type === 'judge');
                // 随机补足剩余单选
                const remainSingle = Math.max(0, 4 - manSingle.length);
                db.all("SELECT * FROM questions WHERE type = 'single' AND id NOT IN (" + MANDATORY_IDS.join(',') + ") ORDER BY RANDOM() LIMIT " + remainSingle, (err, randSingles) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const singles = [...manSingle, ...randSingles];
                db.all("SELECT * FROM questions WHERE type = 'multiple' ORDER BY RANDOM() LIMIT 2", (err, multis) => {
                    if (err) return res.status(500).json({ error: err.message });
                    // 随机补足剩余判断
                    const remainJudge = Math.max(0, 4 - manJudge.length);
                    db.all("SELECT * FROM questions WHERE type = 'judge' AND id NOT IN (" + MANDATORY_IDS.join(',') + ") ORDER BY RANDOM() LIMIT " + remainJudge, (err, randJudges) => {
                        if (err) return res.status(500).json({ error: err.message });
                        const judges = [...manJudge, ...randJudges];
                        // 合并后随机打乱题目顺序
                        const selected = [...singles, ...multis, ...judges].sort(() => 0.5 - Math.random());
                const questionsData = selected.map(q => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: JSON.parse(q.options),
                    answer: q.answer  // 暂存答案用于评分，但不发给前端
                }));
                // 存储到临时会话，注意不要将答案发给前端
                const toStore = questionsData.map(({ id, text, type, options }) => ({ id, text, type, options }));
                db.run("INSERT OR REPLACE INTO temp_sessions (openid, questions, created_at) VALUES (?, ?, ?)", 
                    [openid, JSON.stringify(toStore), new Date().toISOString()], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    // 返回题目（不带答案）
                    res.json({ status: 'new', questions: toStore });
                });
            });
        });
    });
});

// 提交答案并评分
router.post('/submit', getUserIdentifier, (req, res) => {
    const db = req.app.get('db');
    const openid = req.userId;
    const { answers, name, employee_id, department } = req.body; // answers: [{ questionId, userAnswer }]
    
    // 先检查是否已提交
    db.get("SELECT * FROM user_records WHERE openid = ?", [openid], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) {
            return res.json({ status: 'already', score: existing.score });
        }
        
        // 获取临时会话中的题目
        db.get("SELECT * FROM temp_sessions WHERE openid = ?", [openid], (err, session) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!session) {
                return res.status(400).json({ error: '未找到答题会话，请重新扫码开始' });
            }
            
            const tempQuestions = JSON.parse(session.questions);
            // 获取完整题目信息（含答案）
            const questionIds = tempQuestions.map(q => q.id);
            const placeholders = questionIds.map(() => '?').join(',');
            db.all(`SELECT * FROM questions WHERE id IN (${placeholders})`, questionIds, (err, fullQuestions) => {
                if (err) return res.status(500).json({ error: err.message });
                
                let score = 0;
                const answersDetail = [];
                for (let i = 0; i < fullQuestions.length; i++) {
                    const q = fullQuestions[i];
                    const userAns = answers.find(a => a.questionId == q.id)?.userAnswer || '';
                    let isCorrect = false;
                    if (q.type === 'single') {
                        isCorrect = (userAns === q.answer);
                    } else if (q.type === 'multiple') {
                        // 多选题：答案需要完全匹配（顺序无关，但字符串比较需排序）
                        const stdAns = q.answer.split('').sort().join('');
                        const userAnsSorted = userAns.split('').sort().join('');
                        isCorrect = (stdAns === userAnsSorted);
                    } else if (q.type === 'judge') {
                        isCorrect = (userAns === q.answer);
                    }
                    if (isCorrect) score += 10;
                    answersDetail.push({
                        questionId: q.id,
                        userAnswer: userAns,
                        correctAnswer: q.answer,
                        isCorrect
                    });
                }
                
                // 获取当前最大序号
                db.get("SELECT MAX(serial_no) as maxSerial FROM user_records", (err, row) => {
                    const newSerial = (row.maxSerial || 0) + 1;
                    const submitTime = new Date().toISOString();
                    db.run(`INSERT INTO user_records (serial_no, openid, name, employee_id, department, score, answers, question_ids, submit_time)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [newSerial, openid, name || '', employee_id || '', department || '', score, JSON.stringify(answersDetail), JSON.stringify(questionIds), submitTime],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            // 删除临时会话
                            db.run("DELETE FROM temp_sessions WHERE openid = ?", [openid]);
                            res.json({ status: 'success', score, serialNo: newSerial });
                        });
                });
            });
        });
    });
});

// 获取用户得分（再次进入时）
router.get('/score', getUserIdentifier, (req, res) => {
    const db = req.app.get('db');
    const openid = req.userId;
    db.get("SELECT serial_no, score, submit_time FROM user_records WHERE openid = ?", [openid], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (record) {
            res.json({ hasRecord: true, score: record.score, serialNo: record.serial_no, submitTime: record.submit_time });
        } else {
            res.json({ hasRecord: false });
        }
    });
});

module.exports = router;