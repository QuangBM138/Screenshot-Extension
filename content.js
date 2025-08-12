// Expose functions to window for background script access
window.captureFullPage = captureFullPage;
window.captureSelectedArea = captureSelectedArea;

// Message listener cho content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'captureFullPage') {
        captureFullPage().then((imageData) => {
            sendResponse({ image: imageData });
        }).catch((error) => {
            console.error('Capture full page error:', error);
            sendResponse({ error: error.message });
        });
        return true; // Giữ kết nối để gửi response bất đồng bộ
    }
    
    if (request.action === 'captureSelectedArea') {
        captureSelectedArea().then((imageData) => {
            if (imageData === null) {
                sendResponse({ error: 'Chụp vùng chọn bị hủy' });
            } else {
                sendResponse({ image: imageData });
            }
        }).catch((error) => {
            console.error('Capture selected area error:', error);
            sendResponse({ error: error.message });
        });
        return true; // Giữ kết nối để gửi response bất đồng bộ
    }
});

function captureFullPage() {
    return new Promise((resolve, reject) => {
        try {
            // Kiểm tra DOM
            if (!document || !document.body) {
                reject(new Error('DOM not ready'));
                return;
            }
            
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let totalHeight = document.body.scrollHeight;
            let viewportHeight = window.innerHeight;
            canvas.width = window.innerWidth;
            canvas.height = totalHeight;

            // Lưu trạng thái ban đầu
            const originalOverflow = document.body.style.overflow;
            const originalScrollY = window.scrollY;
            
            document.body.style.overflow = 'hidden';
            window.scrollTo(0, 0);

            let img = new Image();
            img.onload = () => {
                try {
                    ctx.drawImage(img, 0, 0);
                    // Khôi phục trạng thái ban đầu
                    window.scrollTo(0, originalScrollY);
                    document.body.style.overflow = originalOverflow;
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    console.error('Error in captureFullPage:', error);
                    // Khôi phục trạng thái ban đầu
                    window.scrollTo(0, originalScrollY);
                    document.body.style.overflow = originalOverflow;
                    reject(error);
                }
            };
            img.onerror = () => {
                console.error('Error loading image in captureFullPage');
                // Khôi phục trạng thái ban đầu
                window.scrollTo(0, originalScrollY);
                document.body.style.overflow = originalOverflow;
                reject(new Error('Failed to load image'));
            };
            
            chrome.runtime.sendMessage({ action: 'capture', mode: 'full' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    // Khôi phục trạng thái ban đầu
                    window.scrollTo(0, originalScrollY);
                    document.body.style.overflow = originalOverflow;
                    reject(chrome.runtime.lastError);
                } else if (response && response.image) {
                    img.src = response.image;
                } else {
                    // Khôi phục trạng thái ban đầu
                    window.scrollTo(0, originalScrollY);
                    document.body.style.overflow = originalOverflow;
                    reject(new Error('No image received'));
                }
            });
        } catch (error) {
            console.error('Error in captureFullPage:', error);
            reject(error);
        }
    });
}

function captureSelectedArea() {
    return new Promise((resolve, reject) => {
        try {
            // Kiểm tra DOM
            if (!document || !document.body) {
                reject(new Error('DOM not ready'));
                return;
            }
            
            // Tạo overlay để chặn tương tác với trang
            let overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'crosshair';
            overlay.style.background = 'rgba(0, 0, 0, 0.1)';
            document.body.appendChild(overlay);

            // Tạo hướng dẫn
            let guide = document.createElement('div');
            guide.style.position = 'fixed';
            guide.style.top = '20px';
            guide.style.left = '50%';
            guide.style.transform = 'translateX(-50%)';
            guide.style.background = 'rgba(0, 0, 0, 0.8)';
            guide.style.color = 'white';
            guide.style.padding = '10px 20px';
            guide.style.borderRadius = '5px';
            guide.style.fontSize = '14px';
            guide.style.fontFamily = 'Arial, sans-serif';
            guide.style.zIndex = '10000';
            guide.textContent = '🎯 Kéo thả để chọn vùng cần chụp (ESC để hủy)';
            document.body.appendChild(guide);

            // Tạo khung chọn
            let selectionDiv = document.createElement('div');
            selectionDiv.style.position = 'fixed';
            selectionDiv.style.border = '2px solid #4285f4';
            selectionDiv.style.background = 'rgba(66, 133, 244, 0.1)';
            selectionDiv.style.zIndex = '10001';
            selectionDiv.style.pointerEvents = 'none';
            document.body.appendChild(selectionDiv);

            // Tạo thông tin kích thước
            let sizeInfo = document.createElement('div');
            sizeInfo.style.position = 'fixed';
            sizeInfo.style.background = 'rgba(0, 0, 0, 0.8)';
            sizeInfo.style.color = 'white';
            sizeInfo.style.padding = '5px 10px';
            sizeInfo.style.borderRadius = '3px';
            sizeInfo.style.fontSize = '12px';
            sizeInfo.style.fontFamily = 'Arial, sans-serif';
            sizeInfo.style.zIndex = '10002';
            sizeInfo.style.pointerEvents = 'none';
            document.body.appendChild(sizeInfo);

            let startX, startY, isSelecting = false;

            // Xử lý phím ESC để hủy
            function handleKeyDown(e) {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            }
            document.addEventListener('keydown', handleKeyDown);

            // Xử lý click để bắt đầu chọn
            overlay.addEventListener('mousedown', (e) => {
                startX = e.clientX;
                startY = e.clientY;
                isSelecting = true;
                selectionDiv.style.left = startX + 'px';
                selectionDiv.style.top = startY + 'px';
                selectionDiv.style.width = '0px';
                selectionDiv.style.height = '0px';
                selectionDiv.style.display = 'block';
                sizeInfo.style.display = 'block';
            });

            // Xử lý di chuyển chuột
            overlay.addEventListener('mousemove', (e) => {
                if (!isSelecting) return;
                
                let width = e.clientX - startX;
                let height = e.clientY - startY;
                
                selectionDiv.style.width = Math.abs(width) + 'px';
                selectionDiv.style.height = Math.abs(height) + 'px';
                selectionDiv.style.left = (width < 0 ? e.clientX : startX) + 'px';
                selectionDiv.style.top = (height < 0 ? e.clientY : startY) + 'px';
                
                // Cập nhật thông tin kích thước
                sizeInfo.textContent = `${Math.abs(width)} × ${Math.abs(height)} px`;
                sizeInfo.style.left = (e.clientX + 10) + 'px';
                sizeInfo.style.top = (e.clientY - 30) + 'px';
            });

            // Xử lý thả chuột để hoàn thành
            overlay.addEventListener('mouseup', () => {
                if (!isSelecting) return;
                isSelecting = false;
                
                let rect = selectionDiv.getBoundingClientRect();
                
                // Kiểm tra kích thước tối thiểu
                if (rect.width < 10 || rect.height < 10) {
                    alert('Vùng chọn quá nhỏ. Vui lòng chọn vùng lớn hơn.');
                    cleanup();
                    resolve(null);
                    return;
                }

                cleanup();

                // Chụp ảnh vùng đã chọn
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                canvas.width = rect.width;
                canvas.height = rect.height;

                chrome.runtime.sendMessage({ action: 'capture', mode: 'full' }, (response) => {
                    try {
                        if (chrome.runtime.lastError) {
                            console.error('Runtime error:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else if (response && response.image) {
                            let img = new Image();
                            img.onload = () => {
                                try {
                                    ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
                                    resolve(canvas.toDataURL('image/png'));
                                } catch (error) {
                                    console.error('Error drawing image:', error);
                                    reject(error);
                                }
                            };
                            img.onerror = () => {
                                console.error('Error loading image');
                                reject(new Error('Failed to load image'));
                            };
                            img.src = response.image;
                        } else {
                            reject(new Error('No image received'));
                        }
                    } catch (error) {
                        console.error('Error in capture response:', error);
                        reject(error);
                    }
                });
            });

            // Hàm dọn dẹp
            function cleanup() {
                try {
                    if (overlay && overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                    if (guide && guide.parentNode) {
                        document.body.removeChild(guide);
                    }
                    if (selectionDiv && selectionDiv.parentNode) {
                        document.body.removeChild(selectionDiv);
                    }
                    if (sizeInfo && sizeInfo.parentNode) {
                        document.body.removeChild(sizeInfo);
                    }
                    document.removeEventListener('keydown', handleKeyDown);
                } catch (error) {
                    console.error('Error in cleanup:', error);
                }
            }
        } catch (error) {
            console.error('Error in captureSelectedArea:', error);
            reject(error);
        }
    });
}