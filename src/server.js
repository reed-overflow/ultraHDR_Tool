const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, '../dist');
const staticDir = fs.existsSync(distDir) ? distDir : __dirname;

// 设置静态文件目录，同时提供dist/src和node_modules目录的访问
app.use(express.static(staticDir));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// 主路由
app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`HDR工具服务器已启动，访问 http://localhost:${PORT} 查看`);
});