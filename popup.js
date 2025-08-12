let statusDiv;

// Đảm bảo DOM load xong
document.addEventListener('DOMContentLoaded', function() {
    statusDiv = document.getElementById('status');
    
    // Thêm event listeners cho tất cả buttons
    const buttons = document.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const mode = this.getAttribute('data-mode');
            
            if (action === 'capture') {
                capture(mode);
            }
        });
    });
});

function showStatus(message) {
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}

async function capture(mode) {
    console.log('Capturing with mode:', mode);
    
    if (mode === 'area') {
        showStatus('🎯 Đang mở chế độ chọn vùng...');
    } else {
        showStatus('Đang chụp màn hình...');
    }
    
    try {
        // Gửi message và chờ response
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Chờ quá lâu, vui lòng thử lại'));
            }, 30000);
            
            chrome.runtime.sendMessage({ action: 'capture', mode }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                resolve(response);
            });
        });
        
        // Kiểm tra response
        if (response && response.error) {
            console.error('Background error:', response.error);
            if (response.error === 'Chụp vùng chọn bị hủy') {
                showStatus('Chụp vùng chọn đã bị hủy');
            } else {
                throw new Error(response.error);
            }
            return;
        }
        
        if (!response || !response.image) {
            throw new Error('Không nhận được ảnh từ background script');
        }
        
        // Xử lý ảnh thành công - tự động mở viewer tab
        console.log('Image captured successfully');
        
        // Tự động mở viewer tab với ảnh vừa chụp
        const imageData = response.image;
        const viewerUrl = chrome.runtime.getURL('viewer.html') + '?image=' + encodeURIComponent(imageData);
        
        // Mở tab mới
        chrome.tabs.create({ url: viewerUrl }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('Lỗi khi mở tab:', chrome.runtime.lastError);
                showStatus('Lỗi khi mở tab mới');
            } else {
                if (mode === 'area') {
                    showStatus('✅ Đã chụp vùng chọn và mở viewer!');
                } else {
                    showStatus('Chụp màn hình thành công và đã mở viewer!');
                }
                // Đóng popup sau khi mở viewer
                window.close();
            }
        });
        
    } catch (error) {
        console.error('Capture error:', error);
        showStatus('Lỗi: ' + error.message);
        alert('Lỗi khi chụp màn hình: ' + error.message);
    }
}