import type { IFileProcessorPlugin, ProcessedFile } from "../../core";

export interface PreviewOptions {
  /** Thumbnail max size (default: 200) */
  size?: number;
  /** Quality 0-1 (default: 0.8) */
  quality?: number;
}

export class ImagePreviewPlugin implements IFileProcessorPlugin {
  name = 'image-preview';
  version = "1.0.0";
  private options: PreviewOptions = {}

  constructor(options: PreviewOptions = {}) {
    this.options = options;
  }

  async afterProcess(processed: ProcessedFile): Promise<ProcessedFile> {
    // Skip non-images
    if (!processed.original.type.startsWith('image/')) {
      return processed;
    }

    const size = this.options.size || 200;
    const quality = this.options.quality || 0.8;

    // Load image
    const img = await this.loadImage(processed.blob);

    // Create thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Calculate size (maintain aspect ratio)
    const ratio = img.width / img.height;
    if (img.width > img.height) {
      canvas.width = size;
      canvas.height = size / ratio;
    } else {
      canvas.height = size;
      canvas.width = size * ratio;
    }

    // Draw thumbnail
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Convert to blob and data URL
    const thumbnail = await this.canvasToBlob(canvas, processed.original.type, quality);
    const thumbnailURL = await this.blobToDataURL(thumbnail);
    const fullURL = await this.blobToDataURL(processed.blob);

    // Add preview to metadata
    return {
      ...processed,
      metadata: {
        ...processed.metadata,
        width: img.width,
        height: img.height,
        thumbnail,
        thumbnailURL,
        previewURL: fullURL
      }
    };
  }

  // Helper: Load image from blob
  private loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  // Helper: Canvas to blob
  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed')),
        type,
        quality
      );
    });
  }

  // Helper: Blob to data URL
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}