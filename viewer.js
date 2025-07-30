let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
let originalImageData = null;
let isProcessed = false;
let colorRules = []; // Lưu các quy tắc màu

// Elements
const imageViewer = document.getElementById('imageViewer');
const noImage = document.getElementById('noImage');
const convertBtn = document.getElementById('convertBtn');
const restoreBtn = document.getElementById('restoreBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const bwModeSelect = document.getElementById('bwMode');
const statusDiv = document.getElementById('status');
const imageInfo = document.getElementById('imageInfo');
const imageSize = document.getElementById('imageSize');
const imageStatus = document.getElementById('imageStatus');
const customColorControls = document.getElementById('customColorControls');
const colorPicker = document.getElementById('colorPicker');
const colorAction = document.getElementById('colorAction');
const addColorRuleBtn = document.getElementById('addColorRuleBtn');
const clearAllRulesBtn = document.getElementById('clearAllRulesBtn');
const colorRulesContainer = document.getElementById('colorRules');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    convertBtn.addEventListener('click', convertToBW);
    restoreBtn.addEventListener('click', restoreOriginal);
    downloadBtn.addEventListener('click', downloadImage);
    copyBtn.addEventListener('click', copyImage);
    addColorRuleBtn.addEventListener('click', addColorRule);
    clearAllRulesBtn.addEventListener('click', clearAllRules);
    
    // Thêm event listener cho dropdown mode
    if (bwModeSelect) {
        bwModeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customColorControls.style.display = 'block';
            } else {
                customColorControls.style.display = 'none';
            }
        });
    }
    
    // Thêm event listener cho image viewer để chọn màu
    if (imageViewer) {
        imageViewer.addEventListener('click', function(e) {
            if (bwModeSelect && bwModeSelect.value === 'custom') {
                pickColorFromImage(e);
            }
        });
    }
    
    // Kiểm tra xem có ảnh được truyền từ popup không
    const urlParams = new URLSearchParams(window.location.search);
    const imageData = urlParams.get('image');
    
    if (imageData) {
        loadImage(imageData);
    }
});

function showStatus(message) {
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}

function loadImage(imageDataUrl) {
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Lưu ảnh gốc
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        isProcessed = false;
        
        // Hiển thị ảnh
        imageViewer.src = canvas.toDataURL('image/png');
        imageViewer.style.display = 'block';
        noImage.style.display = 'none';
        
        // Cập nhật thông tin
        updateImageInfo();
        showStatus('Ảnh đã được tải thành công!');
    };
    img.onerror = () => {
        showStatus('Lỗi khi tải ảnh');
    };
    img.src = imageDataUrl;
}

function updateImageInfo() {
    if (canvas.width && canvas.height) {
        imageSize.textContent = `${canvas.width} x ${canvas.height} pixels`;
        imageStatus.textContent = isProcessed ? 'Đã xử lý' : 'Gốc';
        imageInfo.style.display = 'block';
    }
}

function pickColorFromImage(e) {
    if (!canvas.width || !canvas.height) return;
    
    const rect = imageViewer.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const r = imageData.data[0];
    const g = imageData.data[1];
    const b = imageData.data[2];
    
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    if (colorPicker) {
        colorPicker.value = color;
    }
    
    showStatus(`Đã chọn màu: ${color} (RGB: ${r}, ${g}, ${b})`);
}

function addColorRule() {
    if (!colorPicker || !colorAction) return;
    
    const color = colorPicker.value;
    const action = colorAction.value;
    
    const rule = {
        color: color,
        action: action,
        id: Date.now()
    };
    
    colorRules.push(rule);
    updateColorRulesDisplay();
    showStatus(`Đã thêm quy tắc: ${color} → ${action === 'toWhite' ? 'Trắng' : 'Đen'}`);
}

function clearAllRules() {
    if (colorRules.length === 0) {
        showStatus('Không có quy tắc nào để xóa');
        return;
    }
    
    if (confirm('Bạn có chắc muốn xóa tất cả quy tắc màu?')) {
        colorRules = [];
        updateColorRulesDisplay();
        showStatus('Đã xóa tất cả quy tắc màu!');
    }
}

function updateColorRulesDisplay() {
    if (!colorRulesContainer) return;
    
    colorRulesContainer.innerHTML = '';
    
    if (colorRules.length === 0) {
        colorRulesContainer.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 15px;">Chưa có quy tắc nào</div>';
        return;
    }
    
    colorRules.forEach(rule => {
        const ruleElement = document.createElement('div');
        ruleElement.className = 'color-info';
        ruleElement.innerHTML = `
            <div class="color-preview" style="background-color: ${rule.color}"></div>
            <span>${rule.color} → ${rule.action === 'toWhite' ? 'Trắng' : 'Đen'}</span>
            <button class="remove-rule-btn" data-rule-id="${rule.id}" style="background: #dc3545; padding: 4px 8px; font-size: 12px;">×</button>
        `;
        
        // Thêm event listener cho nút xóa
        const removeBtn = ruleElement.querySelector('.remove-rule-btn');
        removeBtn.addEventListener('click', function() {
            const ruleId = parseInt(this.getAttribute('data-rule-id'));
            removeColorRule(ruleId);
        });
        
        colorRulesContainer.appendChild(ruleElement);
    });
}

function removeColorRule(id) {
    colorRules = colorRules.filter(rule => rule.id !== id);
    updateColorRulesDisplay();
    showStatus('Đã xóa quy tắc màu');
}

function convertToBW() {
    if (!canvas.width || !canvas.height || !originalImageData) {
        showStatus('Không có ảnh để xử lý');
        return;
    }
    
    const mode = bwModeSelect ? bwModeSelect.value : 'enhanced';
    showStatus('Đang chuyển đen trắng...');
    
    // Khôi phục ảnh gốc trước khi xử lý
    ctx.putImageData(originalImageData, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    if (mode === 'custom' && colorRules.length > 0) {
        // Chế độ tùy chỉnh - áp dụng quy tắc màu
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            
            let newValue = null; // Không có giá trị mặc định
            
            // Kiểm tra từng quy tắc màu
            for (const rule of colorRules) {
                if (isColorSimilar(currentColor, rule.color)) {
                    newValue = rule.action === 'toWhite' ? 255 : 0;
                    break;
                }
            }
            
            // Nếu không khớp quy tắc nào, chuyển thành grayscale
            if (newValue === null) {
                newValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
            
            data[i] = data[i + 1] = data[i + 2] = newValue;
        }
        showStatus(`Đã áp dụng ${colorRules.length} quy tắc màu! (Màu khác → Grayscale)`);
    } else if (mode === 'classic') {
        // Chế độ cổ điển - chỉ đen trắng
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;
        }
        showStatus('Đã chuyển đen trắng cổ điển!');
    } else if (mode === 'grayscale') {
        // Chế độ xám - 256 mức độ
        for (let i = 0; i < data.length; i += 4) {
            let luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = Math.round(luminance);
        }
        showStatus('Đã chuyển xám 256 mức độ!');
    } else {
        // Chế độ cải tiến - 4 mức độ với thuật toán Otsu
        let histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            histogram[Math.floor(avg)]++;
        }
        
        let totalPixels = data.length / 4;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 128;
        
        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;
            
            wF = totalPixels - wB;
            if (wF === 0) break;
            
            sumB += i * histogram[i];
            let mB = sumB / wB;
            let mF = (sum - sumB) / wF;
            
            let variance = wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = i;
            }
        }
        
        for (let i = 0; i < data.length; i += 4) {
            let luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            let grayValue;
            if (luminance < threshold * 0.3) {
                grayValue = 0;
            } else if (luminance < threshold * 0.6) {
                grayValue = 85;
            } else if (luminance < threshold * 0.8) {
                grayValue = 170;
            } else {
                grayValue = 255;
            }
            
            data[i] = data[i + 1] = data[i + 2] = grayValue;
        }
        showStatus('Đã chuyển đen trắng với 4 mức độ!');
    }
    
    ctx.putImageData(imageData, 0, 0);
    isProcessed = true;
    
    imageViewer.src = canvas.toDataURL('image/png');
    updateImageInfo();
}

function isColorSimilar(color1, color2, tolerance = 30) {
    // Chuyển đổi hex sang RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };
    
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return false;
    
    const diff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    return diff <= tolerance;
}

function restoreOriginal() {
    if (!originalImageData) {
        showStatus('Không có ảnh gốc để khôi phục');
        return;
    }
    
    ctx.putImageData(originalImageData, 0, 0);
    isProcessed = false;
    
    imageViewer.src = canvas.toDataURL('image/png');
    updateImageInfo();
    showStatus('Đã khôi phục ảnh gốc!');
}

function copyImage() {
    if (!canvas.width || !canvas.height) {
        showStatus('Không có ảnh để copy');
        return;
    }
    
    canvas.toBlob(function(blob) {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(function() {
            showStatus('Đã copy ảnh vào clipboard!');
        }).catch(function(err) {
            console.error('Lỗi khi copy:', err);
            showStatus('Lỗi khi copy ảnh');
        });
    });
}

function downloadImage() {
    if (!canvas.width || !canvas.height) {
        showStatus('Không có ảnh để tải xuống');
        return;
    }
    
    showStatus('Đang tải xuống...');
    
    chrome.downloads.download({
        url: canvas.toDataURL('image/png'),
        filename: 'screenshot_bw.png'
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.error('Lỗi khi tải xuống:', chrome.runtime.lastError);
            showStatus('Lỗi khi tải xuống');
        } else {
            showStatus('Đã tải xuống thành công!');
        }
    });
} 