// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'capture') {
        // Lấy tab hiện tại
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('Query tabs error:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            
            if (!tabs || tabs.length === 0) {
                console.error('No active tab found');
                sendResponse({ error: 'Không tìm thấy tab hiện tại' });
                return;
            }
            
            const activeTab = tabs[0];
            
            if (request.mode === 'full') {
                chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, (dataUrl) => {
                    try {
                        if (chrome.runtime.lastError) {
                            console.error('Capture error:', chrome.runtime.lastError);
                            sendResponse({ error: chrome.runtime.lastError.message });
                        } else if (dataUrl) {
                            console.log('Screenshot captured successfully');
                            sendResponse({ image: dataUrl });
                        } else {
                            console.error('No data URL received');
                            sendResponse({ error: 'Không thể chụp màn hình' });
                        }
                    } catch (error) {
                        console.error('Error sending response:', error);
                    }
                });
            } else if (request.mode === 'page') {
                // Gửi message đến content script
                chrome.tabs.sendMessage(activeTab.id, { action: 'captureFullPage' }, (response) => {
                    try {
                        if (chrome.runtime.lastError) {
                            console.error('Send message error:', chrome.runtime.lastError);
                            sendResponse({ error: chrome.runtime.lastError.message });
                        } else if (response && response.error) {
                            console.error('Content script error:', response.error);
                            sendResponse({ error: response.error });
                        } else if (response && response.image) {
                            sendResponse({ image: response.image });
                        } else {
                            sendResponse({ error: 'Không thể chụp toàn trang' });
                        }
                    } catch (error) {
                        console.error('Error sending response:', error);
                    }
                });
            } else if (request.mode === 'area') {
                // Gửi message đến content script
                chrome.tabs.sendMessage(activeTab.id, { action: 'captureSelectedArea' }, (response) => {
                    try {
                        if (chrome.runtime.lastError) {
                            console.error('Send message error:', chrome.runtime.lastError);
                            sendResponse({ error: chrome.runtime.lastError.message });
                        } else if (response && response.error) {
                            console.error('Content script error:', response.error);
                            if (response.error === 'Chụp vùng chọn bị hủy') {
                                sendResponse({ error: 'Chụp vùng chọn bị hủy' });
                            } else {
                                sendResponse({ error: response.error });
                            }
                        } else if (response && response.image) {
                            sendResponse({ image: response.image });
                        } else {
                            sendResponse({ error: 'Không thể chụp vùng chọn' });
                        }
                    } catch (error) {
                        console.error('Error sending response:', error);
                    }
                });
            }
        });
        
        return true; // Giữ kết nối để gửi response bất đồng bộ
    }
});