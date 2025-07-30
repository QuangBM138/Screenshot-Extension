let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
let preview;
let statusDiv;
let bwModeSelect;
let originalImageData = null; // Lưu ảnh gốc
let isProcessed = false; // Kiểm tra đã xử lý chưa

// Đảm bảo DOM load xong
document.addEventListener('DOMContentLoaded', function() {
    preview = document.getElementById('preview');
    statusDiv = document.getElementById('status');
    bwModeSelect = document.getElementById('bwMode');
    
    // Thêm event listeners cho tất cả buttons
    const buttons = document.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const mode = this.getAttribute('data-mode');
            
            switch(action) {
                case 'capture':
                    capture(mode);
                    break;
                case 'convertToBW':
                    convertToBW();
                    break;
                case 'downloadImage':
                    downloadImage();
                    break;
                case 'restoreOriginal':
                    restoreOriginal();
                    break;
            }
        });
    });
});

function showStatus(message) {
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}

function capture(mode) {
    console.log('Capturing with mode:', mode);
    showStatus('Đang chụp màn hình...');
    
    chrome.runtime.sendMessage({ action: 'capture', mode }, (response) => {
        console.log('Response received:', response);
        
        if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            showStatus('Lỗi: ' + chrome.runtime.lastError.message);
            alert('Lỗi khi chụp màn hình: ' + chrome.runtime.lastError.message);
            return;
        }
        
        if (response && response.error) {
            console.error('Background error:', response.error);
            showStatus('Lỗi: ' + response.error);
            alert('Lỗi khi chụp màn hình: ' + response.error);
            return;
        }
        
        if (response && response.image) {
            let img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Lưu ảnh gốc
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                isProcessed = false;
                
                if (preview) {
                    preview.src = canvas.toDataURL('image/png');
                    preview.style.display = 'block';
                }
                showStatus('Chụp màn hình thành công!');
            };
            img.onerror = () => {
                console.error('Lỗi khi tải ảnh');
                showStatus('Lỗi khi tải ảnh');
                alert('Lỗi khi tải ảnh chụp màn hình');
            };
            img.src = response.image;
        } else {
            console.error('Không nhận được ảnh từ background script');
            showStatus('Không thể chụp màn hình');
            alert('Không thể chụp màn hình. Vui lòng thử lại.');
        }
    });
}

function convertToBW() {
    if (!canvas.width || !canvas.height || !originalImageData) {
        showStatus('Vui lòng chụp màn hình trước');
        alert('Vui lòng chụp màn hình trước khi chuyển đen trắng');
        return;
    }
    
    const mode = bwModeSelect ? bwModeSelect.value : 'enhanced';
    showStatus('Đang chuyển đen trắng...');
    
    // Khôi phục ảnh gốc trước khi xử lý
    ctx.putImageData(originalImageData, 0, 0);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    if (mode === 'classic') {
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
        // Tính toán histogram để tìm ngưỡng tốt hơn
        let histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            histogram[Math.floor(avg)]++;
        }
        
        // Tìm ngưỡng Otsu để tối ưu hóa việc phân tách
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
        
        // Áp dụng thuật toán cải tiến với nhiều mức độ xám
        for (let i = 0; i < data.length; i += 4) {
            // Sử dụng trọng số cho RGB (con người nhạy cảm với màu xanh lá hơn)
            let luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            
            // Tạo nhiều mức độ xám thay vì chỉ đen trắng
            let grayValue;
            if (luminance < threshold * 0.3) {
                grayValue = 0; // Đen
            } else if (luminance < threshold * 0.6) {
                grayValue = 85; // Xám đậm
            } else if (luminance < threshold * 0.8) {
                grayValue = 170; // Xám nhạt
            } else {
                grayValue = 255; // Trắng
            }
            
            data[i] = data[i + 1] = data[i + 2] = grayValue;
        }
        showStatus('Đã chuyển đen trắng với 4 mức độ!');
    }
    
    ctx.putImageData(imageData, 0, 0);
    isProcessed = true;
    
    if (preview) {
        preview.src = canvas.toDataURL('image/png');
    }
}

function restoreOriginal() {
    if (!originalImageData) {
        showStatus('Không có ảnh gốc để khôi phục');
        return;
    }
    
    ctx.putImageData(originalImageData, 0, 0);
    isProcessed = false;
    
    if (preview) {
        preview.src = canvas.toDataURL('image/png');
    }
    showStatus('Đã khôi phục ảnh gốc!');
}

function downloadImage() {
    if (!canvas.width || !canvas.height) {
        showStatus('Vui lòng chụp màn hình trước');
        alert('Vui lòng chụp màn hình trước khi tải xuống');
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
            alert('Lỗi khi tải xuống: ' + chrome.runtime.lastError.message);
        } else {
            showStatus('Đã tải xuống thành công!');
        }
    });
}