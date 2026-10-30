# HTML-Slide-Elements-Splitter

[English](./README.md) | [繁體中文](./README_zh_tw.md)

Splits pictures inside slides into independent elements and removes their backgrounds. Accepts images, PDF files, PowerPoint (`.pptx`), and a public Google Slides link.

Demo: <https://pulipulichen.github.io/HTML-Slide-Elements-Splitter/>

## Description

This application splits slide pictures into separate image files and removes their backgrounds. Upload an image, a PDF, or a PowerPoint (`.pptx`) file, or paste a public Google Slides link into the address field and choose Download and Upload.

A Google Slides link is downloaded as PPTX. Each embedded picture is extracted, including the crop stored on that picture, and then split with the same image cutter used for uploaded images. The whole slide is not flattened into one picture. Text-only slides are skipped. PDF pages are still rendered as a full-page image and then split.

The Google Slides link must be viewable by anyone with the link. A private deck can be downloaded as PowerPoint and uploaded. Embedded pictures must be PNG, JPEG, GIF, or WEBP.

All extracted elements are processed to remove backgrounds. The final output is a set of isolated, transparent-background image files for download or downstream use in content workflows and AI tools (such as Gemini).

## Techniques

- HTML Canvas: Core image-processing surface for pixel reads, transparency conversion, cropping, selection rendering, block outlines, and image export.
- FileReader API: Loads local images and pasted clipboard data as Base64 Data URLs for Canvas processing.
- PDF.js: Parses PDF files and renders pages into high-resolution Canvas images for extraction workflows.
- JSZip: Reads a PowerPoint file, including one exported from a public Google Slides link, and extracts embedded raster pictures in slide order.
- ImageTracer.js: Converts processed raster outputs to vector SVG with edge tracing and style approximation.

## Self-Disclosure

This program was created using Gemini 3 Pro Canvas and completed through multiple iterations and refinements.

## Resources

- [Google NotebookLM](https://notebooklm.google.com/)
