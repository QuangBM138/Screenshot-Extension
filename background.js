chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'capture') {
        if (request.mode === 'full') {
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
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
            });
        } else if (request.mode === 'page') {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: captureFullPage
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Execute script error:', chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else if (results && results[0] && results[0].result) {
                    sendResponse({ image: results[0].result });
                } else {
                    sendResponse({ error: 'Không thể chụp toàn trang' });
                }
            });
        } else if (request.mode === 'area') {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: captureSelectedArea
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Execute script error:', chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else if (results && results[0] && results[0].result) {
                    sendResponse({ image: results[0].result });
                } else {
                    sendResponse({ error: 'Không thể chụp vùng chọn' });
                }
            });
        }
        return true; // Giữ kết nối để gửi response bất đồng bộ
    }
});