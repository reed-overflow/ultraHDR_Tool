// 导入gainmap-js库
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr';

// 获取DOM元素
const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const canvas = document.getElementById('image-canvas');
const canvasContainer = document.getElementById('canvas-container');
const brushSizeInput = document.getElementById('brush-size');
const sizeValue = document.getElementById('size-value');
const opacityInput = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');
const autoThresholdInput = document.getElementById('auto-threshold');
const autoThresholdValue = document.getElementById('auto-threshold-value');
const autoThresholdMin = document.getElementById('auto-threshold-min');
const autoThresholdMax = document.getElementById('auto-threshold-max');
const autoThresholdPreview = document.getElementById('auto-threshold-preview');
const autoBrightMaskBtn = document.getElementById('auto-bright-mask-btn');
const autoBrightPercentMaskBtn = document.getElementById('auto-bright-percent-mask-btn');
const autoDarkMaskBtn = document.getElementById('auto-dark-mask-btn');
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
const languageSelect = document.getElementById('language-select');
const qualityImageDenoiseInput = document.getElementById('quality-image-denoise');
const qualityLuminanceDenoiseInput = document.getElementById('quality-luminance-denoise');
const qualityMaskNoiseInput = document.getElementById('quality-mask-noise');
const qualityMaskFilterInput = document.getElementById('quality-mask-filter');
const qualityImageDenoiseStrengthInput = document.getElementById('quality-image-denoise-strength');
const qualityLuminanceDenoiseStrengthInput = document.getElementById('quality-luminance-denoise-strength');
const qualityMaskNoiseStrengthInput = document.getElementById('quality-mask-noise-strength');
const qualityMaskFilterStrengthInput = document.getElementById('quality-mask-filter-strength');
const qualityImageDenoiseValue = document.getElementById('quality-image-denoise-value');
const qualityLuminanceDenoiseValue = document.getElementById('quality-luminance-denoise-value');
const qualityMaskNoiseValue = document.getElementById('quality-mask-noise-value');
const qualityMaskFilterValue = document.getElementById('quality-mask-filter-value');
const qualityOptionInputs = [
    { input: qualityImageDenoiseInput, key: 'imageDenoise' },
    { input: qualityLuminanceDenoiseInput, key: 'luminanceDenoise' },
    { input: qualityMaskNoiseInput, key: 'maskNoise' },
    { input: qualityMaskFilterInput, key: 'maskFilter' },
];
const qualityStrengthInputs = [
    { input: qualityImageDenoiseStrengthInput, value: qualityImageDenoiseValue, key: 'imageDenoiseStrength', affects: 'source' },
    { input: qualityLuminanceDenoiseStrengthInput, value: qualityLuminanceDenoiseValue, key: 'luminanceDenoiseStrength', affects: 'source' },
    { input: qualityMaskNoiseStrengthInput, value: qualityMaskNoiseValue, key: 'maskNoiseStrength', affects: 'mask' },
    { input: qualityMaskFilterStrengthInput, value: qualityMaskFilterValue, key: 'maskFilterStrength', affects: 'mask' },
];

const autoThresholdPreviewCtx = autoThresholdPreview.getContext('2d');

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
let autoThresholdPreviewTimer = null;
let autoThresholdPreviewToken = 0;
let autoBrightnessStats = null;
let originalImageRatio = 1;
let displayBaseWidth = 0;
let displayBaseHeight = 0;
let zoomLevel = 1;
let activePointerId = null;
let isPanning = false;
let panStart = null;
let lastBrushPoint = null;
let strokeBaseMaskData = null;
let strokeCoverageCanvas = null;
let strokeCoverageCtx = null;
let strokeDirtyBounds = null;
let strokeOpacity = 1;
let strokeTool = 'brush';
const qualitySettings = {
    imageDenoise: false,
    luminanceDenoise: false,
    maskNoise: false,
    maskFilter: false,
    imageDenoiseStrength: 50,
    luminanceDenoiseStrength: 70,
    maskNoiseStrength: 50,
    maskFilterStrength: 50,
};
let processedSourceCanvas = null;
let processedSourceDirty = true;
let processedMaskCanvas = null;
let processedMaskDirty = true;
const maskNoiseSeed = 18273645;
const defaultLanguage = 'zh-CN';
const supportedLanguages = ['zh-CN', 'en'];
let currentLanguage = defaultLanguage;
let currentTranslations = {};
const translationCache = {};

function getInitialLanguage() {
    const savedLanguage = window.localStorage.getItem('ultrahdr-tool-language');
    return supportedLanguages.includes(savedLanguage) ? savedLanguage : defaultLanguage;
}

async function loadTranslations(language) {
    const languageToLoad = supportedLanguages.includes(language) ? language : defaultLanguage;

    if (translationCache[languageToLoad]) {
        return translationCache[languageToLoad];
    }

    const response = await fetch('./i18n/' + languageToLoad + '.json');
    if (!response.ok) {
        throw new Error('Failed to load translations for ' + languageToLoad);
    }

    const translations = await response.json();
    translationCache[languageToLoad] = translations;
    return translations;
}

function formatTranslation(template, params = {}) {
    return template.replace(/\{(\w+)\}/g, (match, key) => (
        Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
}

function t(key, params) {
    const template = currentTranslations[key] || key;
    return formatTranslation(template, params);
}

function setLocalizedText(element, key, params = {}) {
    if (!element) return;

    element.textContent = t(key, params);
    element.dataset.i18nStateKey = key;
    element.dataset.i18nStateParams = JSON.stringify(params);
}

function clearLocalizedState(element) {
    if (!element) return;

    delete element.dataset.i18nStateKey;
    delete element.dataset.i18nStateParams;
}

function applyStaticTranslations() {
    document.documentElement.lang = currentLanguage;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(element => {
        element.dataset.i18nAttr.split(';').forEach(pair => {
            const [attribute, key] = pair.split(':').map(value => value && value.trim());
            if (attribute && key) {
                element.setAttribute(attribute, t(key));
            }
        });
    });

    document.querySelectorAll('[data-i18n-state-key]').forEach(element => {
        const key = element.dataset.i18nStateKey;
        let params = {};

        try {
            params = JSON.parse(element.dataset.i18nStateParams || '{}');
        } catch (error) {
            params = {};
        }

        element.textContent = t(key, params);
    });

    languageSelect.value = currentLanguage;
}

async function setLanguage(language, persist = true) {
    const nextLanguage = supportedLanguages.includes(language) ? language : defaultLanguage;
    currentTranslations = await loadTranslations(nextLanguage);
    currentLanguage = nextLanguage;
    applyStaticTranslations();

    if (persist) {
        window.localStorage.setItem('ultrahdr-tool-language', nextLanguage);
    }
}

async function initI18n() {
    const initialLanguage = getInitialLanguage();

    try {
        await setLanguage(initialLanguage, false);
    } catch (error) {
        console.error('加载翻译文件失败:', error);
        if (initialLanguage !== defaultLanguage) {
            await setLanguage(defaultLanguage, false);
        }
    }

    languageSelect.addEventListener('change', event => {
        setLanguage(event.target.value).catch(error => {
            console.error('切换语言失败:', error);
        });
    });
}

// 初始化函数
async function init() {
    await initI18n();

    // 设置画笔大小和不透明度显示
    sizeValue.textContent = brushSizeInput.value;
    opacityValue.textContent = opacityInput.value;
    autoThresholdValue.textContent = autoThresholdInput.value;
    updateToolButtons();
    updateHistoryButtons();
    autoThresholdInput.disabled = true;
    autoBrightMaskBtn.disabled = true;
    autoBrightPercentMaskBtn.disabled = true;
    autoDarkMaskBtn.disabled = true;
    setAutoThresholdRange(0, 255, Number(autoThresholdInput.value));
    clearAutoThresholdPreview('thresholdPreview.empty');
    setLocalizedText(fileName, 'upload.noFile');
    setPreviewEmptyState('preview.emptyBeforeMask');
    setLocalizedText(previewStatus, 'preview.notGenerated');
    syncQualitySettingsFromInputs();

    // 监听文件上传
    fileInput.addEventListener('change', handleFileUpload);

    // 监听画笔大小和不透明度变化
    brushSizeInput.addEventListener('input', () => {
        sizeValue.textContent = brushSizeInput.value;
    });

    opacityInput.addEventListener('input', () => {
        opacityValue.textContent = opacityInput.value;
    });

    autoThresholdInput.addEventListener('input', () => {
        autoThresholdValue.textContent = autoThresholdInput.value;
        scheduleAutoThresholdPreview();
    });

    qualityOptionInputs.forEach(({ input }) => {
        if (input) {
            input.addEventListener('change', handleQualitySettingChange);
        }
    });

    qualityStrengthInputs.forEach(({ input, affects }) => {
        if (input) {
            input.addEventListener('input', () => handleQualityStrengthChange(affects));
        }
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
    autoBrightMaskBtn.addEventListener('click', () => applyAutoMask('bright'));
    autoBrightPercentMaskBtn.addEventListener('click', () => applyAutoMask('bright-percent'));
    autoDarkMaskBtn.addEventListener('click', () => applyAutoMask('dark'));
    livePreviewToggle.addEventListener('change', () => {
        setLocalizedText(
            previewStatus,
            livePreviewToggle.checked ? 'preview.liveOn' : 'preview.liveOffManual'
        );

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
    clearLocalizedState(fileName);
    fileName.textContent = file.name;

    // 创建图片对象
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function(e) {
        img.onload = function() {
            // 保存当前图片引用
            currentImage = img;
            markSourceQualityDirty();
            markMaskQualityDirty();
            refreshAutoBrightnessStats(false);
            autoThresholdPreviewToken++;

            zoomLevel = 1;
            zoomLevelInput.value = '100';
            zoomValue.textContent = '100';
            autoThresholdInput.disabled = false;
            autoBrightMaskBtn.disabled = false;
            autoBrightPercentMaskBtn.disabled = false;
            autoDarkMaskBtn.disabled = false;

            // 设置Canvas尺寸
            setCanvasSize(img.width, img.height);

            // 绘制图片
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawSourceImage(ctx, canvas.width, canvas.height);

            // 创建遮罩Canvas
            createMaskCanvas();
            undoStack = [];
            redoStack = [];
            setActiveTool('brush');
            updateHistoryButtons();
            scheduleAutoThresholdPreview();
            setPreviewEmptyState('preview.emptyUploaded');
            if (livePreviewToggle.checked) {
                schedulePreviewUpdate(true);
            } else {
                setLocalizedText(previewStatus, 'preview.liveOffAfterUpload');
            }

            // 启用按钮
            clearBtn.disabled = false;
            resetBtn.disabled = false;
            downloadBtn.disabled = false;
            exportHdrBtn.disabled = false;
            undoBtn.disabled = true;
            redoBtn.disabled = true;

            showStatusByKey('status.imageUploaded', 'success');
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

function syncQualitySettingsFromInputs() {
    qualityOptionInputs.forEach(({ input, key }) => {
        if (input) {
            qualitySettings[key] = input.checked;
        }
    });

    qualityStrengthInputs.forEach(({ input, value, key }) => {
        if (input) {
            qualitySettings[key] = Math.max(0, Math.min(100, Number(input.value) || 0));
            if (value) {
                value.textContent = String(qualitySettings[key]);
            }
        }
    });
}

function getQualityStrength(key) {
    return Math.max(0, Math.min(100, Number(qualitySettings[key]) || 0)) / 100;
}

function hasSourceQualitySettings() {
    return qualitySettings.imageDenoise || qualitySettings.luminanceDenoise;
}

function hasMaskQualitySettings() {
    return qualitySettings.maskNoise || qualitySettings.maskFilter;
}

function markSourceQualityDirty() {
    processedSourceDirty = true;
    processedSourceCanvas = null;
}

function markMaskQualityDirty() {
    processedMaskDirty = true;
    processedMaskCanvas = null;
}

function handleQualitySettingChange() {
    const previousSourceDenoise = qualitySettings.imageDenoise;
    const previousLuminanceDenoise = qualitySettings.luminanceDenoise;
    const previousMaskNoise = qualitySettings.maskNoise;
    const previousMaskFilter = qualitySettings.maskFilter;

    syncQualitySettingsFromInputs();

    const sourceDirty = (
        previousSourceDenoise !== qualitySettings.imageDenoise ||
        previousLuminanceDenoise !== qualitySettings.luminanceDenoise
    );

    const maskDirty = (
        previousMaskNoise !== qualitySettings.maskNoise ||
        previousMaskFilter !== qualitySettings.maskFilter
    );

    refreshQualityOutputs({ sourceDirty, maskDirty, showStatus: true });
}

function handleQualityStrengthChange(affects) {
    syncQualitySettingsFromInputs();
    refreshQualityOutputs({
        sourceDirty: affects === 'source',
        maskDirty: affects === 'mask',
        showStatus: false,
    });
}

function refreshQualityOutputs({ sourceDirty = false, maskDirty = false, showStatus = false } = {}) {
    if (sourceDirty) {
        markSourceQualityDirty();
    }

    if (maskDirty) {
        markMaskQualityDirty();
    }

    if (!currentImage || (!sourceDirty && !maskDirty)) return;

    if (sourceDirty) {
        refreshAutoBrightnessStats(true);
        autoThresholdPreviewToken++;
        scheduleAutoThresholdPreview();
    }

    updateCanvas();
    schedulePreviewUpdate(true);

    if (showStatus) {
        showStatusByKey('status.qualityUpdated', 'info');
    }
}

function refreshAutoBrightnessStats(keepCurrentThreshold) {
    if (!currentImage) return;

    const nextStats = analyzeImageBrightness();
    const nextThreshold = keepCurrentThreshold
        ? Number(autoThresholdInput.value)
        : nextStats.defaultThreshold;

    autoBrightnessStats = nextStats;
    setAutoThresholdRange(
        autoBrightnessStats.lowerBound,
        autoBrightnessStats.upperBound,
        nextThreshold
    );
}

function drawSourceImage(targetCtx, width, height) {
    if (!currentImage) return;

    if (hasSourceQualitySettings()) {
        targetCtx.drawImage(getProcessedSourceCanvas(), 0, 0, width, height);
        return;
    }

    targetCtx.drawImage(currentImage, 0, 0, width, height);
}

function getProcessedSourceCanvas() {
    if (!currentImage) return null;

    if (!processedSourceDirty && processedSourceCanvas) {
        return processedSourceCanvas;
    }

    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = currentImage.width;
    sourceCanvas.height = currentImage.height;
    sourceCtx.drawImage(currentImage, 0, 0);

    if (qualitySettings.imageDenoise || qualitySettings.luminanceDenoise) {
        const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

        if (qualitySettings.imageDenoise) {
            applyImageDenoise(imageData, sourceCanvas.width, sourceCanvas.height);
        }

        if (qualitySettings.luminanceDenoise) {
            applyLuminanceDenoise(imageData, sourceCanvas.width, sourceCanvas.height);
        }

        sourceCtx.putImageData(imageData, 0, 0);
    }

    processedSourceCanvas = sourceCanvas;
    processedSourceDirty = false;
    return processedSourceCanvas;
}

function applyImageDenoise(imageData, width, height) {
    const data = imageData.data;
    const source = new Uint8ClampedArray(data);
    const strength = getQualityStrength('imageDenoiseStrength') * 0.8;
    if (strength <= 0) return;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let red = 0;
            let green = 0;
            let blue = 0;
            let count = 0;

            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                const sampleY = y + offsetY;
                if (sampleY < 0 || sampleY >= height) continue;

                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    const sampleX = x + offsetX;
                    if (sampleX < 0 || sampleX >= width) continue;

                    const sampleIndex = (sampleY * width + sampleX) * 4;
                    red += source[sampleIndex];
                    green += source[sampleIndex + 1];
                    blue += source[sampleIndex + 2];
                    count++;
                }
            }

            const index = (y * width + x) * 4;
            data[index] = blendChannel(source[index], red / count, strength);
            data[index + 1] = blendChannel(source[index + 1], green / count, strength);
            data[index + 2] = blendChannel(source[index + 2], blue / count, strength);
        }
    }
}

function applyLuminanceDenoise(imageData, width, height) {
    const data = imageData.data;
    const pixelCount = width * height;
    const luminanceValues = new Float32Array(pixelCount);
    const strength = getQualityStrength('luminanceDenoiseStrength') * 0.9;
    if (strength <= 0) return;

    for (let pixelIndex = 0, dataIndex = 0; pixelIndex < pixelCount; pixelIndex++, dataIndex += 4) {
        luminanceValues[pixelIndex] = getLuminance(data[dataIndex], data[dataIndex + 1], data[dataIndex + 2]);
    }

    const smoothedLuminance = boxBlurFloat(luminanceValues, width, height, 1);

    for (let pixelIndex = 0, dataIndex = 0; pixelIndex < pixelCount; pixelIndex++, dataIndex += 4) {
        const delta = (smoothedLuminance[pixelIndex] - luminanceValues[pixelIndex]) * strength;
        data[dataIndex] = clampByte(data[dataIndex] + delta);
        data[dataIndex + 1] = clampByte(data[dataIndex + 1] + delta);
        data[dataIndex + 2] = clampByte(data[dataIndex + 2] + delta);
    }
}

function boxBlurFloat(source, width, height, radius) {
    const output = new Float32Array(source.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let total = 0;
            let count = 0;

            for (let offsetY = -radius; offsetY <= radius; offsetY++) {
                const sampleY = y + offsetY;
                if (sampleY < 0 || sampleY >= height) continue;

                const rowOffset = sampleY * width;
                for (let offsetX = -radius; offsetX <= radius; offsetX++) {
                    const sampleX = x + offsetX;
                    if (sampleX < 0 || sampleX >= width) continue;

                    total += source[rowOffset + sampleX];
                    count++;
                }
            }

            output[y * width + x] = count > 0 ? total / count : source[y * width + x];
        }
    }

    return output;
}

function blendChannel(originalValue, smoothedValue, strength) {
    return clampByte(originalValue + (smoothedValue - originalValue) * strength);
}

function getLuminance(red, green, blue) {
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function getProcessedMaskCanvas() {
    if (!maskCanvas) return null;

    if (!hasMaskQualitySettings()) {
        return maskCanvas;
    }

    if (!processedMaskDirty && processedMaskCanvas) {
        return processedMaskCanvas;
    }

    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    outputCanvas.width = maskCanvas.width;
    outputCanvas.height = maskCanvas.height;
    outputCtx.drawImage(maskCanvas, 0, 0);

    const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

    if (qualitySettings.maskFilter) {
        applyMaskBilateralFilter(imageData, outputCanvas.width, outputCanvas.height);
    }

    if (qualitySettings.maskNoise) {
        applyMaskNoise(imageData, outputCanvas.width, outputCanvas.height);
    }

    outputCtx.putImageData(imageData, 0, 0);
    processedMaskCanvas = outputCanvas;
    processedMaskDirty = false;
    return processedMaskCanvas;
}

function applyMaskNoise(imageData, width, height) {
    const data = imageData.data;
    const amplitude = getQualityStrength('maskNoiseStrength') * 24;
    if (amplitude <= 0) return;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const gray = (data[index] + data[index + 1] + data[index + 2]) / 3;
            const gain = 255 - gray;
            if (gain <= 4) {
                data[index] = 255;
                data[index + 1] = 255;
                data[index + 2] = 255;
                data[index + 3] = 255;
                continue;
            }

            const noise = (noiseAt(x, y) - 0.5) * 2 * amplitude * Math.min(1, gain / 80);
            const noisyGain = clampByte(gain + noise);
            const value = 255 - noisyGain;
            data[index] = value;
            data[index + 1] = value;
            data[index + 2] = value;
            data[index + 3] = 255;
        }
    }
}

function noiseAt(x, y) {
    let value = Math.imul(x ^ maskNoiseSeed, 374761393) + Math.imul(y, 668265263);
    value = (value ^ (value >>> 13)) >>> 0;
    value = Math.imul(value, 1274126177) >>> 0;
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function applyMaskBilateralFilter(imageData, width, height) {
    const strength = getQualityStrength('maskFilterStrength');
    if (strength <= 0) return;

    const data = imageData.data;
    const pixelCount = width * height;
    const source = new Uint8ClampedArray(pixelCount);
    const output = new Uint8ClampedArray(pixelCount);
    const radius = strength > 0.75 ? 3 : 2;
    const sigmaSpatial = 0.9 + strength * 1.4;
    const sigmaRange = 40 + strength * 90;
    const blendStrength = Math.min(1, strength * 2);
    const spatialWeights = [];
    const rangeWeights = new Float32Array(256);

    for (let index = 0, dataIndex = 0; index < pixelCount; index++, dataIndex += 4) {
        source[index] = clampByte((data[dataIndex] + data[dataIndex + 1] + data[dataIndex + 2]) / 3);
    }

    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
        for (let offsetX = -radius; offsetX <= radius; offsetX++) {
            spatialWeights.push({
                offsetX,
                offsetY,
                weight: Math.exp(-(offsetX * offsetX + offsetY * offsetY) / (2 * sigmaSpatial * sigmaSpatial)),
            });
        }
    }

    for (let difference = 0; difference < rangeWeights.length; difference++) {
        rangeWeights[difference] = Math.exp(-(difference * difference) / (2 * sigmaRange * sigmaRange));
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const centerIndex = y * width + x;
            const centerValue = source[centerIndex];
            let weightedTotal = 0;
            let weightTotal = 0;

            spatialWeights.forEach(({ offsetX, offsetY, weight }) => {
                const sampleX = x + offsetX;
                const sampleY = y + offsetY;
                if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) return;

                const sampleValue = source[sampleY * width + sampleX];
                const combinedWeight = weight * rangeWeights[Math.abs(sampleValue - centerValue)];
                weightedTotal += sampleValue * combinedWeight;
                weightTotal += combinedWeight;
            });

            output[centerIndex] = weightTotal > 0 ? clampByte(weightedTotal / weightTotal) : centerValue;
        }
    }

    for (let index = 0, dataIndex = 0; index < pixelCount; index++, dataIndex += 4) {
        const value = blendChannel(source[index], output[index], blendStrength);
        data[dataIndex] = value;
        data[dataIndex + 1] = value;
        data[dataIndex + 2] = value;
        data[dataIndex + 3] = 255;
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
    markMaskQualityDirty();
}

function setAutoThresholdRange(minValue, maxValue, value) {
    const roundedMin = Math.max(0, Math.min(255, Math.round(minValue)));
    const roundedMax = Math.max(0, Math.min(255, Math.round(maxValue)));
    const boundedValue = Math.max(roundedMin, Math.min(roundedMax, Math.round(value)));

    autoThresholdInput.min = String(roundedMin);
    autoThresholdInput.max = String(roundedMax);
    autoThresholdInput.value = String(boundedValue);
    autoThresholdValue.textContent = String(boundedValue);
    setLocalizedText(autoThresholdMin, 'auto.thresholdMin', { value: roundedMin });
    setLocalizedText(autoThresholdMax, 'auto.thresholdMax', { value: roundedMax });
}

function clearAutoThresholdPreview(messageKey) {
    autoThresholdPreview.width = 1;
    autoThresholdPreview.height = 1;
    autoThresholdPreviewCtx.fillStyle = '#111';
    autoThresholdPreviewCtx.fillRect(0, 0, 1, 1);
    autoThresholdPreview.style.aspectRatio = '1 / 1';
    if (messageKey) {
        setLocalizedText(autoThresholdMin, messageKey);
        autoThresholdMax.textContent = '';
        clearLocalizedState(autoThresholdMax);
    }
}

function analyzeImageBrightness() {
    if (!currentImage) {
        return {
            lowerBound: 0,
            upperBound: 255,
            defaultThreshold: 128,
            mean: 128,
        };
    }

    const analysisCanvas = document.createElement('canvas');
    const analysisCtx = analysisCanvas.getContext('2d');
    analysisCanvas.width = currentImage.width;
    analysisCanvas.height = currentImage.height;
    drawSourceImage(analysisCtx, currentImage.width, currentImage.height);

    const imageData = analysisCtx.getImageData(0, 0, currentImage.width, currentImage.height);
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    let sum = 0;
    let count = 0;

    for (let index = 0; index < data.length; index += 4) {
        const luminance = Math.max(0, Math.min(255, Math.round(
            data[index] * 0.2126 +
            data[index + 1] * 0.7152 +
            data[index + 2] * 0.0722
        )));

        histogram[luminance]++;
        sum += luminance;
        count++;
    }

    let lowerBound = 0;
    let upperBound = 255;
    let cumulative = 0;
    const lowerTarget = count * 0.05;
    const upperTarget = count * 0.95;

    for (let value = 0; value < histogram.length; value++) {
        cumulative += histogram[value];
        if (cumulative >= lowerTarget) {
            lowerBound = value;
            break;
        }
    }

    cumulative = 0;
    for (let value = 0; value < histogram.length; value++) {
        cumulative += histogram[value];
        if (cumulative >= upperTarget) {
            upperBound = value;
            break;
        }
    }

    const mean = count > 0 ? sum / count : 128;
    const defaultThreshold = Math.round(mean);

    if (upperBound <= lowerBound) {
        lowerBound = Math.max(0, defaultThreshold - 40);
        upperBound = Math.min(255, defaultThreshold + 40);
    }

    return {
        lowerBound,
        upperBound,
        defaultThreshold,
        mean,
    };
}

function scheduleAutoThresholdPreview() {
    if (!currentImage || !autoBrightnessStats) return;

    if (autoThresholdPreviewTimer) {
        clearTimeout(autoThresholdPreviewTimer);
    }

    const requestToken = ++autoThresholdPreviewToken;
    autoThresholdPreviewTimer = setTimeout(() => {
        renderAutoThresholdPreview(requestToken);
    }, 80);
}

function renderAutoThresholdPreview(requestToken) {
    if (!currentImage || !autoBrightnessStats) {
        clearAutoThresholdPreview('thresholdPreview.empty');
        return;
    }

    const previewMaxWidth = 280;
    const previewWidth = Math.max(1, Math.min(previewMaxWidth, currentImage.width));
    const previewHeight = Math.max(1, Math.round(previewWidth * (currentImage.height / currentImage.width)));
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = previewWidth;
    sourceCanvas.height = previewHeight;
    sourceCtx.imageSmoothingEnabled = true;
    drawSourceImage(sourceCtx, previewWidth, previewHeight);

    const imageData = sourceCtx.getImageData(0, 0, previewWidth, previewHeight);
    const data = imageData.data;
    const threshold = Number(autoThresholdInput.value);
    const previewImageData = sourceCtx.createImageData(previewWidth, previewHeight);
    const previewData = previewImageData.data;

    for (let index = 0; index < data.length; index += 4) {
        const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        const isBright = luminance >= threshold;
        const value = isBright ? 255 : 0;
        previewData[index] = value;
        previewData[index + 1] = value;
        previewData[index + 2] = value;
        previewData[index + 3] = 255;
    }

    if (requestToken !== autoThresholdPreviewToken) return;

    autoThresholdPreview.width = previewWidth;
    autoThresholdPreview.height = previewHeight;
    autoThresholdPreview.style.aspectRatio = previewWidth + ' / ' + previewHeight;
    autoThresholdPreviewCtx.putImageData(previewImageData, 0, 0);
    autoThresholdPreviewTimer = null;
}

function buildAutoMaskFromThreshold(threshold, brightAsMask) {
    if (!currentImage || !maskCanvas || !maskCtx) return;

    pushHistory();

    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = currentImage.width;
    sourceCanvas.height = currentImage.height;
    drawSourceImage(sourceCtx, currentImage.width, currentImage.height);

    const imageData = sourceCtx.getImageData(0, 0, currentImage.width, currentImage.height);
    const data = imageData.data;

    const output = maskCtx.createImageData(currentImage.width, currentImage.height);
    const outputData = output.data;

    for (let index = 0; index < data.length; index += 4) {
        const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        const isTarget = brightAsMask ? luminance >= threshold : luminance < threshold;
        const value = isTarget ? 0 : 255;
        outputData[index] = value;
        outputData[index + 1] = value;
        outputData[index + 2] = value;
        outputData[index + 3] = 255;
    }

    mergeAutoMaskOutput(outputData);
    updateCanvas();
    schedulePreviewUpdate(true);
}

function buildAutoMaskWithBrightPercentMapping(threshold) {
    if (!currentImage || !maskCanvas || !maskCtx) return;

    pushHistory();

    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = currentImage.width;
    sourceCanvas.height = currentImage.height;
    drawSourceImage(sourceCtx, currentImage.width, currentImage.height);

    const imageData = sourceCtx.getImageData(0, 0, currentImage.width, currentImage.height);
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    const luminanceByPixel = new Uint8Array(currentImage.width * currentImage.height);

    for (let dataIndex = 0, pixelIndex = 0; dataIndex < data.length; dataIndex += 4, pixelIndex++) {
        const luminance = Math.max(0, Math.min(255, Math.round(
            data[dataIndex] * 0.2126 +
            data[dataIndex + 1] * 0.7152 +
            data[dataIndex + 2] * 0.0722
        )));

        luminanceByPixel[pixelIndex] = luminance;
        if (luminance > threshold) {
            histogram[luminance]++;
        }
    }

    let brightPixelCount = 0;
    for (let luminance = threshold + 1; luminance < histogram.length; luminance++) {
        brightPixelCount += histogram[luminance];
    }

    const output = maskCtx.createImageData(currentImage.width, currentImage.height);
    const outputData = output.data;

    if (brightPixelCount === 0) {
        for (let index = 0; index < outputData.length; index += 4) {
            outputData[index] = 255;
            outputData[index + 1] = 255;
            outputData[index + 2] = 255;
            outputData[index + 3] = 255;
        }

        mergeAutoMaskOutput(outputData);
        updateCanvas();
        schedulePreviewUpdate(true);
        return;
    }

    const rankByLuminance = new Array(256).fill(0);
    let runningBrightCount = 0;

    for (let luminance = threshold + 1; luminance < histogram.length; luminance++) {
        const countAtLevel = histogram[luminance];
        if (countAtLevel > 0) {
            const rankPercent = brightPixelCount === 1
                ? 1
                : (runningBrightCount + (countAtLevel - 1) / 2) / (brightPixelCount - 1);
            rankByLuminance[luminance] = Math.max(0, Math.min(1, rankPercent));
            runningBrightCount += countAtLevel;
        }
    }

    for (let pixelIndex = 0, dataIndex = 0; pixelIndex < luminanceByPixel.length; pixelIndex++, dataIndex += 4) {
        const luminance = luminanceByPixel[pixelIndex];
        let value = 255;

        if (luminance > threshold) {
            const percent = rankByLuminance[luminance];
            value = Math.round(255 * (1 - percent));
        }

        outputData[dataIndex] = value;
        outputData[dataIndex + 1] = value;
        outputData[dataIndex + 2] = value;
        outputData[dataIndex + 3] = 255;
    }

    mergeAutoMaskOutput(outputData);
    updateCanvas();
    schedulePreviewUpdate(true);
}

function mergeAutoMaskOutput(autoMaskData) {
    if (!maskCtx || !maskCanvas || !autoMaskData) return;

    const currentMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const currentData = currentMask.data;

    for (let index = 0; index < currentData.length; index += 4) {
        const currentBrightness = 255 - currentData[index];
        const autoBrightness = 255 - autoMaskData[index];
        const mergedBrightness = Math.max(currentBrightness, autoBrightness);
        const mergedValue = 255 - mergedBrightness;

        currentData[index] = mergedValue;
        currentData[index + 1] = mergedValue;
        currentData[index + 2] = mergedValue;
        currentData[index + 3] = 255;
    }

    maskCtx.putImageData(currentMask, 0, 0);
    markMaskQualityDirty();
}

function applyAutoMask(mode) {
    if (!currentImage || !maskCanvas) return;

    const threshold = Number(autoThresholdInput.value);
    if (mode === 'bright-percent') {
        buildAutoMaskWithBrightPercentMapping(threshold);
        showStatusByKey('status.autoBrightPercent', 'success');
        return;
    }

    const isBrightMode = mode === 'bright';
    buildAutoMaskFromThreshold(threshold, isBrightMode);
    showStatusByKey(isBrightMode ? 'status.autoBright' : 'status.autoDark', 'success');
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
    return snapshot;
}

function restoreMask(imageData) {
    if (!maskCtx || !imageData) return;

    maskCtx.putImageData(imageData, 0, 0);
    markMaskQualityDirty();
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

function beginStrokeComposite(baseMaskData) {
    if (!maskCanvas || !maskCtx) return;

    strokeBaseMaskData = baseMaskData || maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    strokeCoverageCanvas = document.createElement('canvas');
    strokeCoverageCanvas.width = maskCanvas.width;
    strokeCoverageCanvas.height = maskCanvas.height;
    strokeCoverageCtx = strokeCoverageCanvas.getContext('2d');
    strokeCoverageCtx.fillStyle = 'black';
    strokeCoverageCtx.strokeStyle = 'black';
    strokeCoverageCtx.lineCap = 'round';
    strokeCoverageCtx.lineJoin = 'round';
    strokeDirtyBounds = null;
    strokeOpacity = parseInt(opacityInput.value, 10) / 100;
    strokeTool = activeTool;
}

function endStrokeComposite() {
    strokeBaseMaskData = null;
    strokeCoverageCanvas = null;
    strokeCoverageCtx = null;
    strokeDirtyBounds = null;
    strokeOpacity = 1;
    strokeTool = 'brush';
}

function expandStrokeDirtyBounds(minX, minY, maxX, maxY) {
    if (!maskCanvas) return;

    const nextBounds = {
        minX: Math.max(0, Math.floor(minX)),
        minY: Math.max(0, Math.floor(minY)),
        maxX: Math.min(maskCanvas.width, Math.ceil(maxX)),
        maxY: Math.min(maskCanvas.height, Math.ceil(maxY)),
    };

    if (nextBounds.maxX <= nextBounds.minX || nextBounds.maxY <= nextBounds.minY) return;

    strokeDirtyBounds = nextBounds;
}

function applyStrokeComposite() {
    if (!strokeBaseMaskData || !strokeCoverageCtx || !strokeDirtyBounds || !maskCtx || !maskCanvas) return;

    const x = strokeDirtyBounds.minX;
    const y = strokeDirtyBounds.minY;
    const width = strokeDirtyBounds.maxX - strokeDirtyBounds.minX;
    const height = strokeDirtyBounds.maxY - strokeDirtyBounds.minY;
    if (width <= 0 || height <= 0) return;

    const coverageData = strokeCoverageCtx.getImageData(x, y, width, height).data;
    const output = maskCtx.createImageData(width, height);
    const outputData = output.data;
    const baseData = strokeBaseMaskData.data;
    const targetValue = strokeTool === 'eraser' ? 255 : 0;

    for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
            const localIndex = (row * width + column) * 4;
            const coverage = coverageData[localIndex + 3] / 255;
            const effectiveOpacity = coverage * strokeOpacity;
            const baseIndex = ((y + row) * maskCanvas.width + x + column) * 4;
            const baseGray = (baseData[baseIndex] + baseData[baseIndex + 1] + baseData[baseIndex + 2]) / 3;
            const value = clampByte(baseGray * (1 - effectiveOpacity) + targetValue * effectiveOpacity);

            outputData[localIndex] = value;
            outputData[localIndex + 1] = value;
            outputData[localIndex + 2] = value;
            outputData[localIndex + 3] = 255;
        }
    }

    maskCtx.putImageData(output, x, y);
    markMaskQualityDirty();
}

function drawPoint(x, y) {
    const size = parseInt(brushSizeInput.value, 10);
    const opacity = parseInt(opacityInput.value, 10) / 100;
    const color = activeTool === 'eraser'
        ? 'rgba(255, 255, 255, ' + opacity + ')'
        : 'rgba(0, 0, 0, ' + opacity + ')';

    if (strokeCoverageCtx) {
        const radius = size / 2;
        strokeCoverageCtx.beginPath();
        strokeCoverageCtx.arc(x, y, radius, 0, Math.PI * 2);
        strokeCoverageCtx.fill();
        expandStrokeDirtyBounds(x - radius - 2, y - radius - 2, x + radius + 2, y + radius + 2);
        applyStrokeComposite();
        return;
    }

    maskCtx.beginPath();
    maskCtx.arc(x, y, size / 2, 0, Math.PI * 2);
    maskCtx.fillStyle = color;
    maskCtx.fill();
    markMaskQualityDirty();
}

function drawStrokeSegment(fromPoint, toPoint) {
    const size = parseInt(brushSizeInput.value, 10);
    const opacity = parseInt(opacityInput.value, 10) / 100;
    const color = activeTool === 'eraser'
        ? 'rgba(255, 255, 255, ' + opacity + ')'
        : 'rgba(0, 0, 0, ' + opacity + ')';

    if (strokeCoverageCtx) {
        const radius = size / 2;
        strokeCoverageCtx.lineCap = 'round';
        strokeCoverageCtx.lineJoin = 'round';
        strokeCoverageCtx.lineWidth = size;
        strokeCoverageCtx.beginPath();
        strokeCoverageCtx.moveTo(fromPoint.x, fromPoint.y);
        strokeCoverageCtx.lineTo(toPoint.x, toPoint.y);
        strokeCoverageCtx.stroke();
        expandStrokeDirtyBounds(
            Math.min(fromPoint.x, toPoint.x) - radius - 2,
            Math.min(fromPoint.y, toPoint.y) - radius - 2,
            Math.max(fromPoint.x, toPoint.x) + radius + 2,
            Math.max(fromPoint.y, toPoint.y) + radius + 2
        );
        applyStrokeComposite();
        return;
    }

    maskCtx.fillStyle = color;
    maskCtx.strokeStyle = color;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = size;
    maskCtx.beginPath();
    maskCtx.moveTo(fromPoint.x, fromPoint.y);
    maskCtx.lineTo(toPoint.x, toPoint.y);
    maskCtx.stroke();
    markMaskQualityDirty();
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

function setPreviewEmptyState(messageKey) {
    setLocalizedText(previewEmpty, messageKey);
    previewEmpty.style.display = 'flex';
    previewImage.classList.remove('visible');
}

function setPreviewImage(url, messageKey) {
    previewImage.src = url;
    previewImage.classList.add('visible');
    previewEmpty.style.display = 'none';
    setLocalizedText(previewStatus, messageKey);
}

function schedulePreviewUpdate(force = false) {
    if (!currentImage || !maskCanvas) return;

    if (previewUpdateTimer) {
        clearTimeout(previewUpdateTimer);
    }

    if (!force && !livePreviewToggle.checked) return;

    setLocalizedText(previewStatus, 'preview.generating');
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

    setLocalizedText(previewStatus, 'preview.generating');
    const requestToken = ++previewRequestToken;
    generateUltraHDRPreview(requestToken);
}

function canvasToBlob(canvasElement, type) {
    return new Promise(resolve => {
        canvasElement.toBlob(blob => resolve(blob), type, 1.0);
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
    drawSourceImage(originalCtx, currentImage.width, currentImage.height);

    const originalBlob = await canvasToBlob(originalCanvas, 'image/jpeg');
    const originalArray = new Uint8Array(await originalBlob.arrayBuffer());

    const gainCanvas = document.createElement('canvas');
    const gainCtx = gainCanvas.getContext('2d');
    gainCanvas.width = currentImage.width;
    gainCanvas.height = currentImage.height;

    const tempMaskCanvas = document.createElement('canvas');
    const tempMaskCtx = tempMaskCanvas.getContext('2d');
    const exportMaskCanvas = getProcessedMaskCanvas();
    tempMaskCanvas.width = exportMaskCanvas.width;
    tempMaskCanvas.height = exportMaskCanvas.height;
    tempMaskCtx.drawImage(exportMaskCanvas, 0, 0);

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
        setPreviewEmptyState('preview.emptyBeforeMask');
        setLocalizedText(previewStatus, 'preview.notGenerated');
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
        setPreviewImage(url, 'preview.updated');
    } catch (error) {
        if (requestToken !== previewRequestToken) return;

        console.error('生成UltraHDR预览失败:', error);
        setLocalizedText(previewStatus, 'preview.failedStatus');
        setPreviewEmptyState('preview.failedEmpty');
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
    markMaskQualityDirty();
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
    const baseMaskData = pushHistory();
    beginStrokeComposite(baseMaskData);

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
    canvas.lastPoint = currentPoint;
    lastBrushPoint = currentPoint;

    // 更新主Canvas
    updateCanvas();
}

// 停止绘制
function stopDrawing(e) {
    const wasDrawing = isDrawing;
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

    if (wasDrawing) {
        endStrokeComposite();
    }

    if (currentImage && maskCanvas && hasMaskQualitySettings()) {
        updateCanvas();
    }
}

// 更新Canvas显示
function updateCanvas() {
    if (!currentImage || !maskCanvas) return;

    // 清除主Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制原图
    drawSourceImage(ctx, canvas.width, canvas.height);

    // 再绘制黑白遮罩（使用混合模式）
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(isDrawing ? maskCanvas : getProcessedMaskCanvas(), 0, 0);
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
    markMaskQualityDirty();

    // 更新主Canvas
    updateCanvas();
    schedulePreviewUpdate();

    showStatusByKey('status.maskCleared', 'success');
}

function undoMask() {
    if (!undoStack.length || !maskCanvas) return;

    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const previousState = undoStack.pop();
    redoStack.push(currentState);
    restoreMask(previousState);
    schedulePreviewUpdate();
    showStatusByKey('status.undo', 'success');
}

function redoMask() {
    if (!redoStack.length || !maskCanvas) return;

    const currentState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const nextState = redoStack.pop();
    undoStack.push(currentState);
    restoreMask(nextState);
    schedulePreviewUpdate();
    showStatusByKey('status.redo', 'success');
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
        showStatusByKey('status.toolBrush', 'info');
        return;
    }

    if (key === 'e') {
        setActiveTool('eraser');
        showStatusByKey('status.toolEraser', 'info');
    }
}

// 重置图片
function resetImage() {
    // 重置文件输入
    fileInput.value = '';
    setLocalizedText(fileName, 'upload.noFile');

    // 清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hideBrushPreview();

    // 重置变量
    currentImage = null;
    maskCanvas = null;
    maskCtx = null;
    markSourceQualityDirty();
    markMaskQualityDirty();
    undoStack = [];
    redoStack = [];
    isDrawing = false;
    canvas.lastPoint = null;
    endStrokeComposite();
    setActiveTool('brush');
    zoomLevel = 1;
    zoomLevelInput.value = '100';
    zoomValue.textContent = '100';
    autoBrightnessStats = null;
    autoThresholdPreviewToken++;
    if (autoThresholdPreviewTimer) {
        clearTimeout(autoThresholdPreviewTimer);
        autoThresholdPreviewTimer = null;
    }
    autoThresholdInput.disabled = true;
    autoBrightMaskBtn.disabled = true;
    autoBrightPercentMaskBtn.disabled = true;
    autoDarkMaskBtn.disabled = true;
    setAutoThresholdRange(0, 255, 128);
    clearAutoThresholdPreview('thresholdPreview.empty');

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
    setPreviewEmptyState('preview.emptyInitial');
    setLocalizedText(previewStatus, 'preview.notGenerated');

    showStatusByKey('status.uploadNewImage', 'info');
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

    showStatusByKey('status.maskDownloaded', 'success');
}



// 将原图和遮罩合并成一张UltraHDR图片，并下载
async function exportUltraHDR() {
    if (!currentImage || !maskCanvas) {
        showStatusByKey('status.needImageAndMask', 'error');
        return;
    }

    try {
        showStatusByKey('status.exportGenerating', 'info');

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

        showStatusByKey('status.exportSuccess', 'success');
    } catch (error) {
        console.error('导出UltraHDR图片失败:', error);
        showStatusByKey('status.exportFailed', 'error');
    }
}


// 显示状态消息
function showStatus(message, type) {
    clearLocalizedState(statusMessage);
    statusMessage.textContent = message;
    showStatusElement(type);
}

function showStatusByKey(messageKey, type, params = {}) {
    setLocalizedText(statusMessage, messageKey, params);
    showStatusElement(type);
}

function showStatusElement(type) {

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
window.addEventListener('load', () => {
    init().catch(error => {
        console.error('初始化失败:', error);
    });
});
