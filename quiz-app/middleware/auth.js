// middleware/auth.js
// 用户识别：优先使用微信OpenID，否则生成唯一标识存入session
function getUserIdentifier(req, res, next) {
    // 如果已有session中的userId，直接使用
    if (req.session.userId) {
        req.userId = req.session.userId;
        return next();
    }
    
    // 尝试从微信授权获取（需要配置微信appid和secret）
    // 为简化部署，此处生成一个UUID并存入session
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    req.session.userId = userId;
    req.userId = userId;
    next();
}

module.exports = { getUserIdentifier };