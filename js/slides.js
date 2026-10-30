// --- Google Slides / PPTX ---
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const OFFICE_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const RASTER_MIME = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
};

function parseGoogleSlidesId(url) {
    let parsed;
    try {
        parsed = new URL(url, window.location.href);
    } catch (e) {
        return null;
    }
    if (parsed.hostname !== 'docs.google.com') return null;
    const match = parsed.pathname.match(/\/presentation\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/);
    return match ? match[1] : null;
}

function isPptxFile(file) {
    const name = (file && file.name ? file.name : '').toLowerCase();
    const type = file && file.type ? file.type : '';
    return type === PPTX_MIME || name.endsWith('.pptx');
}

function filenameFromContentDisposition(header) {
    if (!header) return '';
    const star = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(header);
    if (star && star[2]) {
        const encoded = star[2].trim().replace(/^["']|["']$/g, '');
        try {
            return decodeURIComponent(encoded);
        } catch (e) {
            return encoded;
        }
    }
    const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
    if (quoted) return quoted[1];
    const plain = /filename\s*=\s*([^;]+)/i.exec(header);
    if (plain) return plain[1].trim().replace(/^["']|["']$/g, '');
    return '';
}

function safePptxFilename(name) {
    const base = String(name || '').split(/[/\\]/).pop().trim();
    if (!base) return 'slides.pptx';
    return base.toLowerCase().endsWith('.pptx') ? base : `${base}.pptx`;
}

async function downloadGoogleSlidesFile(url) {
    const id = parseGoogleSlidesId(url);
    if (!id) {
        throw new Error(t('toast.downloadFailed'));
    }
    const exportUrl = `https://docs.google.com/presentation/d/${id}/export/pptx`;
    const response = await fetch(exportUrl, { credentials: 'omit' });
    if (!response.ok) {
        throw new Error(`${t('toast.downloadFailed')} (${response.status})`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('text/html') !== -1) {
        throw new Error(t('alert.slidesNotPublic'));
    }
    const blob = await response.blob();
    if (!blob.size) {
        throw new Error(t('toast.downloadFailed'));
    }
    const filename = safePptxFilename(filenameFromContentDisposition(response.headers.get('content-disposition')));
    return new File([blob], filename, {
        type: blob.type || PPTX_MIME
    });
}

function xmlHasParseError(doc) {
    if (!doc || !doc.documentElement) return true;
    if (doc.documentElement.localName === 'parsererror') return true;
    return !!doc.querySelector('parsererror');
}

function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (xmlHasParseError(doc)) {
        throw new Error(t('alert.invalidPptx'));
    }
    return doc;
}

function elementsByLocalName(root, name) {
    const found = [];
    const start = root && root.documentElement ? root.documentElement : root;
    if (!start) return found;
    const walk = (node) => {
        Array.from(node.children || []).forEach((child) => {
            if (child.localName === name) found.push(child);
            walk(child);
        });
    };
    walk(start);
    return found;
}

function firstDescendant(root, name) {
    return elementsByLocalName(root, name)[0] || null;
}

function relationshipAttr(el, local) {
    if (!el) return null;
    const viaNs = el.getAttributeNS(OFFICE_REL_NS, local);
    if (viaNs) return viaNs;
    for (let i = 0; i < el.attributes.length; i++) {
        const item = el.attributes[i];
        if (item.name === `r:${local}` || (item.localName === local && item.prefix === 'r')) {
            return item.value;
        }
    }
    return null;
}

function relationshipMap(doc) {
    const map = {};
    elementsByLocalName(doc, 'Relationship').forEach((rel) => {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) map[id] = target;
    });
    return map;
}

function joinZipPath(baseDir, target) {
    const raw = String(target || '').replace(/\\/g, '/');
    const stack = raw.charAt(0) === '/' ? [] : String(baseDir || '').split('/').filter(Boolean);
    raw.split('/').forEach((part) => {
        if (!part || part === '.') return;
        if (part === '..') stack.pop();
        else stack.push(part);
    });
    return stack.join('/');
}

function relsPathFor(partPath) {
    const parts = partPath.split('/');
    const name = parts.pop();
    return parts.concat('_rels', `${name}.rels`).join('/');
}

function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(t('alert.invalidPptx')));
        };
        img.src = url;
    });
}

function percentCrop(value) {
    const n = parseInt(value || '0', 10);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.min(1, n / 100000);
}

function applySrcRect(img, srcRect) {
    if (!srcRect) return Promise.resolve(img);
    const left = percentCrop(srcRect.getAttribute('l'));
    const top = percentCrop(srcRect.getAttribute('t'));
    const right = percentCrop(srcRect.getAttribute('r'));
    const bottom = percentCrop(srcRect.getAttribute('b'));
    if (left === 0 && top === 0 && right === 0 && bottom === 0) {
        return Promise.resolve(img);
    }

    const fullW = img.naturalWidth || img.width;
    const fullH = img.naturalHeight || img.height;
    let sx = Math.round(fullW * left);
    let sy = Math.round(fullH * top);
    let sw = Math.round(fullW * (1 - left - right));
    let sh = Math.round(fullH * (1 - top - bottom));
    if (sx < 0) sx = 0;
    if (sy < 0) sy = 0;
    if (sx + sw > fullW) sw = fullW - sx;
    if (sy + sh > fullH) sh = fullH - sy;
    if (sw < 1 || sh < 1) return Promise.resolve(null);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return new Promise((resolve, reject) => {
        const cropped = new Image();
        cropped.onload = () => resolve(cropped);
        cropped.onerror = () => reject(new Error(t('alert.invalidPptx')));
        cropped.src = canvas.toDataURL('image/png');
    });
}

async function listSlidePaths(zip) {
    const presFile = zip.file('ppt/presentation.xml');
    const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (!presFile || !relsFile) {
        throw new Error(t('alert.invalidPptx'));
    }
    const pres = parseXml(await presFile.async('string'));
    const rels = parseXml(await relsFile.async('string'));
    const relMap = relationshipMap(rels);
    const lists = elementsByLocalName(pres, 'sldIdLst');
    if (!lists.length) return [];

    const paths = [];
    elementsByLocalName(lists[0], 'sldId').forEach((sld) => {
        const target = relMap[relationshipAttr(sld, 'id')];
        if (!target) return;
        paths.push(joinZipPath('ppt', target));
    });
    return paths;
}

async function extractSlidePictures(zip, slidePath, deckName, pageNumber) {
    const images = [];
    let skippedUnsupported = 0;
    const slideFile = zip.file(slidePath);
    const relsFile = zip.file(relsPathFor(slidePath));
    if (!slideFile || !relsFile) return { images, skippedUnsupported };

    const slide = parseXml(await slideFile.async('string'));
    const rels = parseXml(await relsFile.async('string'));
    const relMap = relationshipMap(rels);
    const slideDir = slidePath.split('/').slice(0, -1).join('/');
    const pics = elementsByLocalName(slide, 'pic');
    let index = 0;

    for (let i = 0; i < pics.length; i++) {
        const blip = firstDescendant(pics[i], 'blip');
        const embed = relationshipAttr(blip, 'embed');
        const target = embed ? relMap[embed] : '';
        const mediaPath = target ? joinZipPath(slideDir, target) : '';
        const ext = mediaPath.split('.').pop().toLowerCase();
        const mime = RASTER_MIME[ext];
        const mediaFile = mediaPath ? zip.file(mediaPath) : null;
        if (!mime || !mediaFile) {
            skippedUnsupported += 1;
            continue;
        }

        const bytes = await mediaFile.async('uint8array');
        const blob = new Blob([bytes], { type: mime });
        let img = await loadImageFromBlob(blob);
        img = await applySrcRect(img, firstDescendant(pics[i], 'srcRect'));
        if (!img) {
            skippedUnsupported += 1;
            continue;
        }
        index += 1;
        images.push({
            name: `${deckName} (P${pageNumber}-${index})`,
            element: img
        });
    }

    return { images, skippedUnsupported };
}

async function processPPTX(file) {
    if (typeof JSZip === 'undefined') {
        throw new Error(t('alert.slidesLibraryMissing'));
    }
    const buffer = await file.arrayBuffer();
    let zip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (e) {
        throw new Error(t('alert.invalidPptx'));
    }

    const slidePaths = await listSlidePaths(zip);
    const images = [];
    let skippedUnsupported = 0;
    for (let i = 0; i < slidePaths.length; i++) {
        const extracted = await extractSlidePictures(zip, slidePaths[i], file.name, i + 1);
        images.push(...extracted.images);
        skippedUnsupported += extracted.skippedUnsupported;
    }
    return { images, skippedUnsupported };
}
