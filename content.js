function captureFullPage() {
    return new Promise((resolve) => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let totalHeight = document.body.scrollHeight;
        let viewportHeight = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = totalHeight;

        document.body.style.overflow = 'hidden';
        let scrollY = window.scrollY;
        window.scrollTo(0, 0);

        let img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            window.scrollTo(0, scrollY);
            document.body.style.overflow = '';
            resolve(canvas.toDataURL('image/png'));
        };
        chrome.runtime.sendMessage({ action: 'capture', mode: 'full' }, (response) => {
            img.src = response.image;
        });
    });
}

function captureSelectedArea() {
    return new Promise((resolve) => {
        let selectionDiv = document.createElement('div');
        selectionDiv.style.position = 'fixed';
        selectionDiv.style.border = '2px dashed red';
        selectionDiv.style.background = 'rgba(0, 0, 0, 0.1)';
        selectionDiv.style.zIndex = '1000';
        document.body.appendChild(selectionDiv);

        let startX, startY, isSelecting = false;

        document.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isSelecting = true;
            selectionDiv.style.left = startX + 'px';
            selectionDiv.style.top = startY + 'px';
            selectionDiv.style.width = '0px';
            selectionDiv.style.height = '0px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            let width = e.clientX - startX;
            let height = e.clientY - startY;
            selectionDiv.style.width = Math.abs(width) + 'px';
            selectionDiv.style.height = Math.abs(height) + 'px';
            selectionDiv.style.left = (width < 0 ? e.clientX : startX) + 'px';
            selectionDiv.style.top = (height < 0 ? e.clientY : startY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isSelecting) return;
            isSelecting = false;
            let rect = selectionDiv.getBoundingClientRect();
            document.body.removeChild(selectionDiv);

            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            canvas.width = rect.width;
            canvas.height = rect.height;

            chrome.runtime.sendMessage({ action: 'capture', mode: 'full' }, (response) => {
                let img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = response.image;
            });
        });
    });
}