const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录，同时提供src和node_modules目录的访问
app.use(express.static(__dirname));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// 主路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`HDR工具服务器已启动，访问 http://localhost:${PORT} 查看`);
});