
window.handlePdfUrl = async (url) => {
    if (state.images.length > 0) {
        if (!window.confirm(t("confirm.clearCurrentResults"))) {
            return;
        }
    }
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
        showToast(t("toast.enterPdfUrl"), "fa-triangle-exclamation");
        return;
    }

    const slidesId = parseGoogleSlidesId(trimmedUrl);
    DOM.statusMsg.classList.remove('hidden');
    DOM.statusText.innerText = slidesId ? t("toast.downloadSlides") : t("toast.downloadPdf");

    try {
        let file;
        if (slidesId) {
            file = await downloadGoogleSlidesFile(trimmedUrl);
        } else {
            const response = await fetch(trimmedUrl);
            if (!response.ok) {
                throw new Error(`${t("toast.downloadFailed")} (${response.status})`);
            }

            const blob = await response.blob();
            const filename = trimmedUrl.split('/').pop() || 'download.pdf';
            file = new File([blob], filename, {
                type: blob.type || 'application/pdf'
            });
        }
        await handleFiles([file]);
    } catch (error) {
        console.error(error);
        const failedFetch = error && error.message === 'Failed to fetch';
        showToast(failedFetch ? t("toast.downloadFailed") : (error.message || t("toast.downloadFailed")), "fa-triangle-exclamation");
        DOM.statusMsg.classList.add('hidden');
    }
};

async function processPDF(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(buffer).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        await new Promise(r => img.onload = r);
        images.push({ name: `${file.name} (P${i})`, element: img });
    }
    return images;
}
