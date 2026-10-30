# HTML-Slide-Elements-Splitter

[English](./README.md) | [繁體中文](./README_zh_tw.md)

將投影片裡的圖片分解成獨立元素，並移除背景。可接受圖片、PDF、PowerPoint（`.pptx`），以及公開的 Google 簡報連結。

Demo: <https://pulipulichen.github.io/HTML-Slide-Elements-Splitter/>

## 說明

這個應用程式會把投影片裡的圖片拆成個別檔案，並移除背景。可以上傳圖片、PDF 或 PowerPoint（`.pptx`），也可以把公開的 Google 簡報網址貼到網址欄，再按「下載並上傳」。

Google 簡報會先下載成 PPTX。每一張內嵌圖片都會被取出，並套用該圖片在簡報裡儲存的裁切，再交給與上傳圖片相同的切割流程。整頁投影片不會被壓成一張圖。只有文字的頁面會略過。PDF 仍是先把每一頁畫成整頁圖片再切割。

Google 簡報連結必須是「知道連結的使用者」可以檢視。非公開的簡報請先下載成 PowerPoint 再上傳。內嵌圖片需為 PNG、JPEG、GIF 或 WEBP。

萃取出的元素都會做去背。最終輸出為多個透明背景的獨立圖片檔，可下載或串接後續內容流程與 AI 工具（例如 Gemini）。

## 技術

- HTML Canvas：影像處理核心介面，負責像素讀取、透明化轉換、裁切、選取區渲染、區塊輪廓繪製與輸出。
- FileReader API：讀取本機圖片與剪貼簿貼上內容，轉為 Base64 Data URL 供 Canvas 處理。
- PDF.js：解析 PDF 並將頁面渲染為高解析 Canvas 影像，作為後續分解來源。
- JSZip：讀取 PowerPoint，包含從公開 Google 簡報匯出的檔案，並依頁序取出內嵌的點陣圖片。
- ImageTracer.js：將處理後的點陣影像轉為向量 SVG，支援邊緣描繪與樣式近似。

## 自我揭露

此程式由 Gemini 3 Pro Canvas 建立，並經多次迭代與微調完成。

## 資源

- [Google NotebookLM](https://notebooklm.google.com/)
