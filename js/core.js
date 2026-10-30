// --- Core Logic ---
window.handleFiles = async (fileList, append = false) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    if (!append) {
        state.images = [];
        state.uploadBatchSeq = 0;
        DOM.resultsArea.innerHTML = '';
        DOM.sidebarContent.innerHTML = '';
    }
    DOM.emptyState.classList.add('hidden');

    DOM.resultsArea.classList.remove('hidden');
    DOM.statusMsg.classList.remove('hidden');
    DOM.statusText.innerText = t("toast.readingFiles");

    toggleSidebar(true);

    const newImages = [];
    const globalSettings = getGlobalSettings();
    state.uploadBatchSeq += 1;
    const batchId = `batch-${state.uploadBatchSeq}`;
    const batchIndex = state.uploadBatchSeq;
    let skippedUnsupported = 0;

    try {
        for (const file of files) {
            if (file.type === 'application/pdf') {
                DOM.statusText.innerText = t("toast.parsingPdf", { name: file.name });
                const pdfImages = await processPDF(file);
                pdfImages.forEach(img => {
                    newImages.push(createImageObject(img.name, img.element, globalSettings, batchId, batchIndex));
                });
            } else if (file.type.startsWith('image/')) {
                DOM.statusText.innerText = t("toast.readingImage", { name: file.name });
                const imgEl = await loadImage(file);
                newImages.push(createImageObject(file.name, imgEl, globalSettings, batchId, batchIndex));
            } else if (isPptxFile(file)) {
                DOM.statusText.innerText = t("toast.parsingSlides", { name: file.name });
                const slideResult = await processPPTX(file);
                if (!slideResult.images.length) {
                    const key = slideResult.skippedUnsupported > 0
                        ? "alert.unsupportedSlideImages"
                        : "alert.noSlideImages";
                    throw new Error(t(key));
                }
                skippedUnsupported += slideResult.skippedUnsupported;
                slideResult.images.forEach(img => {
                    newImages.push(createImageObject(img.name, img.element, globalSettings, batchId, batchIndex));
                });
            }
        }

        state.images = [...state.images, ...newImages];
        DOM.statusText.innerText = t("toast.analyzing");
        await new Promise(r => setTimeout(r, 50));

        for (const imgData of newImages) {
            smartDetect(imgData);
            appendResultCard(imgData);
        }
        initScrollSpy();
        renderDirectoryModalContent();

        if (skippedUnsupported > 0) {
            showToast(t("toast.skippedUnsupportedImages", { count: skippedUnsupported }), "fa-triangle-exclamation");
        }

        if (append && newImages.length > 0) {
            const firstId = newImages[0].id;
            const firstCard = document.getElementById(`card-${firstId}`);
            if (firstCard) {
                firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

    } catch (e) {
        console.error(e);
        alert(t("alert.processingError", { message: e.message }));
        if (state.images.length === 0) {
            DOM.resultsArea.classList.add('hidden');
            DOM.emptyState.classList.remove('hidden');
        }
    } finally {
        DOM.statusMsg.classList.add('hidden');
    }
};

function createImageObject(name, element, settings, batchId, batchIndex) {
    return {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        imgElement: element,
        batchId: batchId,
        batchIndex: batchIndex,
        settings: { ...settings }, 
        objects: [],
        processedCanvas: null,
        ocrResults: [] // Changed from single ocrResult to array
    };
}

window.applyGlobalToAll = () => {
    if (state.images.length === 0) return;
    const globalSettings = getGlobalSettings();
    state.images.forEach(img => { img.settings = { ...globalSettings }; });
    reprocessAllImages();
    showToast(t("toast.globalApplied"), "fa-layer-group");
};

function getGlobalSettings() {
    return {
        size: parseFloat(DOM.g_sizeInput.value),
        merge: parseFloat(DOM.g_mergeInput.value),
        tolerance: parseInt(DOM.g_tolInput.value)
    };
}

async function reprocessAllImages() {
    DOM.resultsArea.innerHTML = '';
    DOM.sidebarContent.innerHTML = '';
    for (const imgData of state.images) {
        const result = detectObjects(imgData.imgElement, imgData.settings);
        // Preserve manual objects
        const manualObjs = imgData.objects.filter(o => o.isManual);
        imgData.objects = [...result.objects, ...manualObjs];
        
        imgData.processedCanvas = result.transparentCanvas;
        imgData.autoTuned = null;
        appendResultCard(imgData);
    }
    initScrollSpy();
    renderDirectoryModalContent();
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
