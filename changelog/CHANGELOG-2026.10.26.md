# 2026.10.26

Week of 2026-10-26 (Asia/Taipei, Monday start).

### Added

- Accept PowerPoint (`.pptx`) uploads and a public Google Slides link in the address field. A Slides link is downloaded as PPTX before processing.
- Extract embedded raster pictures (PNG, JPEG, GIF, WEBP) in slide order and apply each picture's stored crop before the existing image splitter runs. Text-only slides are skipped, and the whole slide is not flattened into one image.
- Warn when a deck has no splittable pictures, when its pictures are not a supported raster format, or when some embedded images are skipped.
- Load JSZip in the page so PPTX packages, including exports from public Google Slides, can be read in the browser.

### Changed

- Update the upload control, drag overlay, directory empty state, and URL placeholder in English and Traditional Chinese to mention PDF, PPTX, and Google Slides.
- Document PPTX and public Google Slides input in the English and Traditional Chinese READMEs. PDF pages are still rendered as a full-page image and then split.

### Fixed

- Run the GitHub Actions E2E image build on the default network. Buildx 0.37.2 and later reject `network: host` unless Compose passes `--allow=network.host`, which current Compose does not.
- Restore the empty state when file processing fails before any image is added.
- Show the download-failed message when a URL request fails without an HTTP response.
