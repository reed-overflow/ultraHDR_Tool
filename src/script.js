// 获取DOM元素
const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const canvas = document.getElementById('image-canvas');
const canvasContainer = document.getElementById('canvas-container');
const brushSizeInput = document.getElementById('brush-size');
const sizeValue = document.getElementById('size-value');
const opacityInput = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');
const brushBtn = document.getElementById('brush-btn');
const eraserBtn = document.getElementById('eraser-btn');
const moveBtn = document.getElementById('move-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomLevelInput = document.getElementById('zoom-level');
const zoomValue = document.getElementById('zoom-value');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const exportHdrBtn = document.getElementById('export-hdr-btn');
const statusMessage = document.getElementById('status-message');
const brushPreview = document.getElementById('brush-preview');
const previewImage = document.getElementById('ultrahdr-preview-image');
const previewEmpty = document.getElementById('ultrahdr-preview-empty');
const previewStatus = document.getElementById('ultrahdr-preview-status');
const livePreviewToggle = document.getElementById('live-preview-toggle');
const refreshPreviewBtn = document.getElementById('refresh-preview-btn');

// 获取Canvas上下文
const ctx = canvas.getContext('2d');

// 全局变量
let isDrawing = false;
let currentImage = null;
let maskCanvas = null;
let maskCtx = null;
let activeTool = 'brush';
let undoStack = [];
let redoStack = [];
const historyLimit = 20;
let previewUpdateTimer = null;
let previewRequestToken = 0;
let originalImageRatio = 1;
let displayBaseWidth = 0;
let displayBaseHeight = 0;
let zoomLevel = 1;
let activePointerId = null;
let isPanning = false;
let panStart = null;
let lastBrushPoint = null;

// 初始化函数
function init() {
    // 设置画笔大小和不透明度显示
    sizeValue.textContent = brushSizeInput.value;
    opacityValue.textContent = opacityInput.value;
    updateToolButtons();
    updateHistoryButtons();

    // 监听文件上传
    fileInput.addEventListener('change', handleFileUpload);

    // 监听画笔大小和不透明度变化
    brushSizeInput.addEventListener('input', () => {
        sizeValue.textContent = brushSizeInput.value;
    });

    opacityInput.addEventListener('input', () => {
        opacityValue.textContent = opacityInput.value;
    });

    brushBtn.addEventListener('click', () => setActiveTool('brush'));
    eraserBtn.addEventListener('click', () => setActiveTool('eraser'));
    moveBtn.addEventListener('click', () => setActiveTool('move'));
    undoBtn.addEventListener('click', undoMask);
    redoBtn.addEventListener('click', redoMask);
    zoomOutBtn.addEventListener('click', () => setZoomLevel(zoomLevel - 0.2));
    zoomResetBtn.addEventListener('click', () => setZoomLevel(1));
    zoomInBtn.addEventListener('click', () => setZoomLevel(zoomLevel + 0.2));
    zoomLevelInput.addEventListener('input', () => setZoomLevel(Number(zoomLevelInput.value) / 100, true));
    refreshPreviewBtn.addEventListener('click', () => triggerManualPreviewUpdate());
    livePreviewToggle.addEventListener('change', () => {
        previewStatus.textContent = livePreviewToggle.checked
            ? '已开启实时更新预览。'
            : '已关闭实时更新预览，请点击“更新预览”手动生成。';

        if (livePreviewToggle.checked) {
            schedulePreviewUpdate(true);
        }
    });

    // 监听绘制事件
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
    canvas.addEventListener('pointerenter', showBrushPreview);
    canvas.addEventListener('pointermove', updateBrushPreview);
    canvas.addEventListener('pointerleave', hideBrushPreview);
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    canvasContainer.addEventListener('scroll', hideBrushPreview);
    canvasContainer.addEventListener('wheel', handleCanvasWheel, { passive: false });

    document.addEventListener('keydown', handleKeyboardShortcuts);

    // 监听按钮点击
    clearBtn.addEventListener('click', clearMask);
    resetBtn.addEventListener('click', resetImage);
    downloadBtn.addEventListener('click', downloadMask);
    exportHdrBtn.addEventListener('click', exportUltraHDR);

    window.addEventListener('resize', () => {
        if (currentImage) {
            applyCanvasDisplaySize();
        }
    });
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 显示文件名
    fileName.textContent = file.name;

    // 创建图片对象
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function(e) {
        img.onload = function() {
            // 保存当前图片引用
            currentImage = img;

            zoomLevel = 1;
            zoomLevelInput.value = '100';
            zoomValue.textContent = '100';

            // 设置Canvas尺寸
            setCanvasSize(img.width, img.height);

            // 绘制图片
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 创建遮罩Canvas
            createMaskCanvas();
            undoStack = [];
            redoStack = [];
            setActiveTool('brush');
            updateHistoryButtons();
            setPreviewEmptyState('已上传图片，开始绘制遮罩后将显示当前 UltraHDR 预览。');
            if (livePreviewToggle.checked) {
                schedulePreviewUpdate(true);
            } else {
                previewStatus.textContent = '实时预览已关闭，点击“更新预览”手动生成。';
            }

            // 启用按钮
            clearBtn.disabled = false;
            resetBtn.disabled = false;
            downloadBtn.disabled = false;
            exportHdrBtn.disabled = false;
            undoBtn.disabled = true;
            redoBtn.disabled = true;

            showStatus('图片已上传，现在可以绘制遮罩', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 设置Canvas尺寸
function setCanvasSize(width, height) {
    // 设置Canvas尺寸
    canvas.width = width;
    canvas.height = height;
    canvasContainer.style.width = '100%';
    canvasContainer.style.maxWidth = '100%';
    canvasContainer.style.height = 'auto';
    originalImageRatio = width / height;

    applyCanvasDisplaySize();
}

function applyCanvasDisplaySize() {
    if (!currentImage) return;

    const viewport = canvasContainer.clientWidth || canvasContainer.parentElement.clientWidth || window.innerWidth;
    const maxHeight = Math.max(240, Math.floor(window.innerHeight * 0.72));
    const fitRatio = Math.min(viewport / canvas.width, maxHeight / canvas.height, 1);

    displayBaseWidth = Math.max(1, Math.floor(canvas.width * fitRatio));
    displayBaseHeight = Math.max(1, Math.floor(canvas.height * fitRatio));

    const displayWidth = Math.max(1, Math.floor(displayBaseWidth * zoomLevel));
    const displayHeight = Math.max(1, Math.floor(displayBaseHeight * zoomLevel));

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    canvasContainer.scrollLeft = 0;
    canvasContainer.scrollTop = 0;
    updateBrushPreviewStyle();
}

function setZoomLevel(nextZoomLevel, fromInput = false) {
    const clamped = Math.min(4, Math.max(0.25, nextZoomLevel));
    zoomLevel = clamped;

    if (!fromInput) {
        zoomLevelInput.value = String(Math.round(clamped * 100));
    }

    zoomValue.textContent = String(Math.round(clamped * 100));

    if (currentImage) {
        applyCanvasDisplaySize();
    }
}

// 创建遮罩Canvas
function createMaskCanvas() {
    // 如果已存在，先移除
    if (maskCanvas) {
        maskCanvas.remove();
    }

    // 创建新的遮罩Canvas
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    maskCtx = maskCanvas.getContext('2d');

    // 填充白色背景
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function setActiveTool(tool) {
    activeTool = tool;
    updateToolButtons();
    updateBrushPreviewStyle();
    updateCanvasToolCursor();
}

function updateToolButtons() {
    brushBtn.classList.toggle('active', activeTool === 'brush');
    eraserBtn.classList.toggle('active', activeTool === 'eraser');
    moveBtn.classList.toggle('active', activeTool === 'move');
}

function updateHistoryButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

function pushHistory() {
    if (!maskCtx) return;

    const snapshot = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    undoStack.push(snapshot);

    if (undoStack.length > historyLimit) {
        undoStack.shift();
    }

    redoStack = [];
    updateHistoryButtons();
}

function restoreMask(imageData) {
    if (!maskCtx || !imageData) return;

    maskCtx.putImageData(imageData, 0, 0);
    updateCanvas();
    updateHistoryButtons();
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

function getCanvasDisplayPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        displayX: event.clientX - rect.left,
        displayY: event.clientY - rect.top,
        imageX: (event.clientX - rect.left) * (canvas.width / rect.width),
        imageY: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function drawPoint(x, y) {
    const size = parseInt(brushSizeInput.value, 10);
    const opacity = parseInt(opacityInput.value, 10) / 100;
    const color = activeTool === 'eraser'
        ? 'rgba(255, 255, 255, ' + opacity + ')'
        : 'rgba(0, 0, 0, ' + opacity + ')';

    maskCtx.beginPath();
    maskCtx.arc(x, y, size / 2, 0, Math.PI * 2);
    maskCtx.fillStyle = color;
    maskCtx.fill();
}

function drawStrokeSegment(fromPoint, toPoint) {
    const size = parseInt(brushSizeInput.value, 10);
    const opacity = parseInt(opacityInput.value, 10) / 100;
    const color = activeTool === 'eraser'
        ? 'rgba(255, 255, 255, ' + opacity + ')'
        : 'rgba(0, 0, 0, ' + opacity + ')';

    const distance = Math.max(1, Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y));
    const step = Math.max(0.5, size / 4);
    const steps = Math.ceil(distance / step);

    maskCtx.fillStyle = color;
    maskCtx.strokeStyle = color;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = size;
    maskCtx.beginPath();
    maskCtx.moveTo(fromPoint.x, fromPoint.y);
    maskCtx.lineTo(toPoint.x, toPoint.y);
    maskCtx.stroke();

    for (let index = 1; index <= steps; index++) {
        const t = index / steps;
        const x = fromPoint.x + (toPoint.x - fromPoint.x) * t;
        const y = fromPoint.y + (toPoint.y - fromPoint.y) * t;
        maskCtx.beginPath();
        maskCtx.arc(x, y, size / 2, 0, Math.PI * 2);
        maskCtx.fill();
    }
}

function updateCanvasToolCursor() {
    canvas.classList.toggle('tool-move', activeTool === 'move');
}

function updateBrushPreviewStyle() {
    const size = parseInt(brushSizeInput.value, 10);
    const displayScale = canvas.width ? (canvas.getBoundingClientRect().width / canvas.width) : 1;
    const previewSize = Math.max(8, Math.round(size * displayScale));
    brushPreview.style.width = previewSize + 'px';
    brushPreview.style.height = previewSize + 'px';
    brushPreview.style.borderColor = activeTool === 'eraser' ? 'rgba(255, 87, 34, 0.8)' : 'rgba(21, 101, 192, 0.75)';
    brushPreview.style.background = activeTool === 'eraser' ? 'rgba(255, 87, 34, 0.12)' : 'rgba(21, 101, 192, 0.12)';
}

function showBrushPreview() {
    if (!currentImage) return;

    updateBrushPreviewStyle();
    brushPreview.classList.add('visible');
}

function updateBrushPreview(event) {
    if (!currentImage) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    brushPreview.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
    brushPreview.classList.add('visible');
}

function hideBrushPreview() {
    brushPreview.classList.remove('visible');
}

function handleCanvasWheel(event) {
    if (activeTool !== 'move') return;

    event.preventDefault();
    const deltaX = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    const deltaY = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    canvasContainer.scrollLeft += deltaX;
    canvasContainer.scrollTop += deltaY;
    hideBrushPreview();
}

function setPreviewEmptyState(message) {
    previewEmpty.textContent = message;
    previewEmpty.style.display = 'flex';
    previewImage.classList.remove('visible');
}

function setPreviewImage(url, message) {
    previewImage.src = url;
    previewImage.classList.add('visible');
    previewEmpty.style.display = 'none';
    previewStatus.textContent = message;
}

function schedulePreviewUpdate(force = false) {
    if (!currentImage || !maskCanvas) return;

    if (previewUpdateTimer) {
        clearTimeout(previewUpdateTimer);
    }

    if (!force && !livePreviewToggle.checked) return;

    previewStatus.textContent = '正在生成 UltraHDR 预览...';
    const requestToken = ++previewRequestToken;

    previewUpdateTimer = setTimeout(() => {
        generateUltraHDRPreview(requestToken);
    }, 180);
}

function triggerManualPreviewUpdate(force) {
    if (!currentImage || !maskCanvas) return;

    if (previewUpdateTimer) {
        clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
    }

    previewStatus.textContent = '正在生成 UltraHDR 预览...';
    const requestToken = ++previewRequestToken;
    generateUltraHDRPreview(requestToken);
}

function canvasToBlob(canvasElement, type) {
    return new Promise(resolve => {
        canvasElement.toBlob(blob => resolve(blob), type);
    });
}

async function buildUltraHDRResult() {
    if (!currentImage || !maskCanvas) {
        throw new Error('missing-source');
    }

    const originalCanvas = document.createElement('canvas');
    const originalCtx = originalCanvas.getContext('2d');
    originalCanvas.width = currentImage.width;
    originalCanvas.height = currentImage.height;
    originalCtx.drawImage(currentImage, 0, 0);

    const originalBlob = await canvasToBlob(originalCanvas, 'image/jpeg');
    const originalArray = new Uint8Array(await originalBlob.arrayBuffer());

    const gainCanvas = document.createElement('canvas');
    const gainCtx = gainCanvas.getContext('2d');
    gainCanvas.width = currentImage.width;
    gainCanvas.height = currentImage.height;

    const tempMaskCanvas = document.createElement('canvas');
    const tempMaskCtx = tempMaskCanvas.getContext('2d');
    tempMaskCanvas.width = maskCanvas.width;
    tempMaskCanvas.height = maskCanvas.height;
    tempMaskCtx.drawImage(maskCanvas, 0, 0);

    const maskImageData = tempMaskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const maskData = maskImageData.data;

    for (let i = 0; i < maskData.length; i += 4) {
        const gray = (maskData[i] + maskData[i + 1] + maskData[i + 2]) / 3;
        const invertedGray = 255 - gray;
        maskData[i] = invertedGray;
        maskData[i + 1] = invertedGray;
        maskData[i + 2] = invertedGray;
        maskData[i + 3] = 255;
    }

    tempMaskCtx.putImageData(maskImageData, 0, 0);
    gainCtx.drawImage(tempMaskCanvas, 0, 0, currentImage.width, currentImage.height);

    const gainBlob = await canvasToBlob(gainCanvas, 'image/jpeg');
    const gainArray = new Uint8Array(await gainBlob.arrayBuffer());

    const libraryInstance = await libultrahdr.getLibrary();
    const metadata = {
        gainMapMax: 1.4888443464573364,
        gainMapMin: 0,
        gamma: 1,
        hdrCapacityMax: 1.4888443464573364,
        hdrCapacityMin: 0,
        offsetHdr: 0.015625,
        offsetSdr: 0.015625,
    };

    const result = libraryInstance.appendGainMap(
        currentImage.width,
        currentImage.height,
        originalArray,
        originalArray.length,
        gainArray,
        gainArray.length,
        metadata.gainMapMax,
        metadata.gainMapMin,
        metadata.gamma,
        metadata.offsetSdr,
        metadata.offsetHdr,
        metadata.hdrCapacityMin,
        metadata.hdrCapacityMax
    );

    return new Blob([result], { type: 'image/jpeg' });
}

async function generateUltraHDRPreview(requestToken) {
    if (!currentImage || !maskCanvas) {
        setPreviewEmptyState('上传图片并绘制遮罩后，这里会显示 UltraHDR 预览。');
        previewStatus.textContent = '尚未生成预览。';
        return;
    }

    try {
        const blob = await buildUltraHDRResult();
        if (requestToken !== previewRequestToken) return;

        const url = URL.createObjectURL(blob);
        if (previewImage.dataset.previewUrl) {
            URL.revokeObjectURL(previewImage.dataset.previewUrl);
        }
        previewImage.dataset.previewUrl = url;
        setPreviewImage(url, '当前遮罩对应的 UltraHDR 预览已更新。');
    } catch (error) {
        if (requestToken !== previewRequestToken) return;

        console.error('生成UltraHDR预览失败:', error);
        previewStatus.textContent = '预览生成失败，请继续编辑后重试。';
        setPreviewEmptyState('预览暂时无法生成。');
    }
}

function drawLine(fromPoint, toPoint) {
    const size = parseInt(brushSizeInput.value, 10);
    const opacity = parseInt(opacityInput.value, 10) / 100;
    const color = activeTool === 'eraser'
        ? 'rgba(255, 255, 255, ' + opacity + ')'
        : 'rgba(0, 0, 0, ' + opacity + ')';

    maskCtx.beginPath();
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = size;
    maskCtx.strokeStyle = color;
    maskCtx.moveTo(fromPoint.x, fromPoint.y);
    maskCtx.lineTo(toPoint.x, toPoint.y);
    maskCtx.stroke();
}

// 开始绘制
function startDrawing(e) {
    if (!currentImage) return;

    if (activeTool === 'move') {
        e.preventDefault();
        isPanning = true;
        activePointerId = e.pointerId;
        panStart = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: canvasContainer.scrollLeft,
            scrollTop: canvasContainer.scrollTop,
        };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('is-panning');
        hideBrushPreview();
        return;
    }

    isDrawing = true;
    canvas.setPointerCapture(e.pointerId);
    pushHistory();

    const point = getCanvasDisplayPoint(e);
    const imagePoint = { x: point.imageX, y: point.imageY };
    drawPoint(imagePoint.x, imagePoint.y);
    canvas.lastPoint = imagePoint;
    lastBrushPoint = imagePoint;

    // 更新主Canvas
    updateCanvas();
}

// 绘制
function draw(e) {
    if (isPanning && activeTool === 'move' && panStart) {
        if (!currentImage) return;
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        canvasContainer.scrollLeft = panStart.scrollLeft - deltaX;
        canvasContainer.scrollTop = panStart.scrollTop - deltaY;
        hideBrushPreview();
        return;
    }

    if (!isDrawing || !currentImage || activeTool === 'move') return;

    const point = getCanvasDisplayPoint(e);
    const currentPoint = { x: point.imageX, y: point.imageY };
    const lastPoint = lastBrushPoint || currentPoint;

    drawStrokeSegment(lastPoint, currentPoint);
    drawPoint(currentPoint.x, currentPoint.y);
    canvas.lastPoint = currentPoint;
    lastBrushPoint = currentPoint;

    // 更新主Canvas
    updateCanvas();
}

// 停止绘制
function stopDrawing(e) {
    isDrawing = false;
    canvas.lastPoint = null;
    lastBrushPoint = null;
    if (isPanning) {
        isPanning = false;
        panStart = null;
        canvas.classList.remove('is-panning');
        activePointerId = null;
    }
    if (maskCtx) {
        maskCtx.closePath();
    }

    if (e && e.pointerId !== undefined && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
    }
}

// 更新Canvas显示
function updateCanvas() {
    if (!currentImage || !maskCanvas) return;

    // 清除主Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制原图
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

    // 再绘制黑白遮罩（使用混合模式）
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();

    schedulePreviewUpdate();
}

// 清除遮罩
function clearMask() {
    if (!maskCanvas) return;

    pushHistory();

    // 清除遮罩Canvas（填充白色）
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 更新主Canvas
    updateCanvas();
    schedulePreviewUpdate();

    showStatus('遮罩已清除', 'success');
}

function undoMask() {
    if (!undoStack.length || !maskCanvas) return;

    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const previousState = undoStack.pop();
    redoStack.push(currentState);
    restoreMask(previousState);
    schedulePreviewUpdate();
    showStatus('已撤销上一步操作', 'success');
}

function redoMask() {
    if (!redoStack.length || !maskCanvas) return;

    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const nextState = redoStack.pop();
    undoStack.push(currentState);
    restoreMask(nextState);
    schedulePreviewUpdate();
    showStatus('已重做上一步操作', 'success');
}

function handleKeyboardShortcuts(event) {
    if (!currentImage) return;

    const key = event.key.toLowerCase();

    if (event.ctrlKey && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
            redoMask();
        } else {
            undoMask();
        }
        return;
    }

    if (event.ctrlKey && key === 'y') {
        event.preventDefault();
        redoMask();
        return;
    }

    if (key === 'b') {
        setActiveTool('brush');
        showStatus('已切换到画笔', 'info');
        return;
    }

    if (key === 'e') {
        setActiveTool('eraser');
        showStatus('已切换到橡皮', 'info');
    }
}

// 重置图片
function resetImage() {
    // 重置文件输入
    fileInput.value = '';
    fileName.textContent = '未选择图片';

    // 清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hideBrushPreview();

    // 重置变量
    currentImage = null;
    maskCanvas = null;
    maskCtx = null;
    undoStack = [];
    redoStack = [];
    isDrawing = false;
    canvas.lastPoint = null;
    setActiveTool('brush');
    zoomLevel = 1;
    zoomLevelInput.value = '100';
    zoomValue.textContent = '100';

    // 禁用按钮
    clearBtn.disabled = true;
    resetBtn.disabled = true;
    downloadBtn.disabled = true;
    exportHdrBtn.disabled = true;
    updateHistoryButtons();
    previewRequestToken++;
    if (previewImage.dataset.previewUrl) {
        URL.revokeObjectURL(previewImage.dataset.previewUrl);
        delete previewImage.dataset.previewUrl;
    }
    previewImage.classList.remove('visible');
    previewImage.removeAttribute('src');
    setPreviewEmptyState('上传图片后，这里会显示当前的 UltraHDR 预览。');
    previewStatus.textContent = '尚未生成预览。';

    showStatus('请上传新图片', 'info');
}

// 下载遮罩图
function downloadMask() {
    if (!maskCanvas) return;

    // 创建一个临时Canvas用于生成黑白遮罩图
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // 设置临时Canvas尺寸
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    
    // 获取遮罩Canvas的像素数据
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    
    // 处理像素数据：将灰度转换为黑白遮罩
    for (let i = 0; i < data.length; i += 4) {
        // 计算灰度值（简单平均）
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // 转换为黑白：灰度小于128的设为黑色（不透明），大于等于128的设为白色（透明）
        if (gray < 128) {
            // 黑色区域（不透明）
            data[i] = 0;     // 红
            data[i + 1] = 0; // 绿
            data[i + 2] = 0; // 蓝
            data[i + 3] = 255; // 完全不透明
        } else {
            // 白色区域（透明）
            data[i] = 255;   // 红
            data[i + 1] = 255; // 绿
            data[i + 2] = 255; // 蓝
            data[i + 3] = 0;   // 完全透明
        }
    }
    
    // 将处理后的像素数据绘制到临时Canvas
    tempCtx.putImageData(imageData, 0, 0);

    // 获取数据URL
    const dataURL = tempCanvas.toDataURL('image/png');

    // 创建下载链接
    const link = document.createElement('a');
    link.href = dataURL;

    // 设置文件名
    let filename = 'mask.png';
    if (fileInput.files.length > 0) {
        const originalName = fileInput.files[0].name;
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        filename = nameWithoutExt + '_mask.png';
    }
    link.download = filename;

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showStatus('遮罩图已下载', 'success');
}



// 导入gainmap-js库
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr';

// 将原图和遮罩合并成一张UltraHDR图片，并下载
async function exportUltraHDR() {
    if (!currentImage || !maskCanvas) {
        showStatus('请先上传图片并创建遮罩', 'error');
        return;
    }

    try {
        showStatus('正在生成UltraHDR图片...', 'info');

        const resultBlob = await buildUltraHDRResult();

        // 下载生成的UltraHDR图片
        const url = URL.createObjectURL(resultBlob);
        const link = document.createElement('a');
        link.href = url;

        // 设置文件名
        let filename = 'ultrahdr.jpg';
        if (fileInput.files.length > 0) {
            const originalName = fileInput.files[0].name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            filename = nameWithoutExt + '_ultrahdr.jpg';
        }
        link.download = filename;

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放URL对象
        URL.revokeObjectURL(url);

        showStatus('UltraHDR图片已导出', 'success');
    } catch (error) {
        console.error('导出UltraHDR图片失败:', error);
        showStatus('导出失败，请重试', 'error');
    }
}


// 显示状态消息
function showStatus(message, type) {
    statusMessage.textContent = message;

    // 设置样式根据类型
    if (type === 'error') {
        statusMessage.style.backgroundColor = '#f8d7da';
        statusMessage.style.color = '#721c24';
        statusMessage.style.borderColor = '#f5c6cb';
    } else if (type === 'success') {
        statusMessage.style.backgroundColor = '#d4edda';
        statusMessage.style.color = '#155724';
        statusMessage.style.borderColor = '#c3e6cb';
    } else {
        statusMessage.style.backgroundColor = '#e3f2fd';
        statusMessage.style.color = '#0d47a1';
        statusMessage.style.borderColor = '#bbdefb';
    }

    // 显示消息
    statusMessage.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// 页面加载完成后初始化
window.addEventListener('load', init);
