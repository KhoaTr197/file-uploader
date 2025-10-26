import type { FileMetadata, IFileProcessorPlugin, ProcessedFile } from "../../core";

export interface PreviewConfig {
  /** 
   * Kích thước hình ảnh xem trước (px)
   * * @default 200 (Width: 200px, Height: 200px)
   */
  size?: number;
  /**
   * Chất lượng hình ảnh xem trước (từ 0.1 đến 1.0)
   * @default 0.8
   */
  quality?: number;
}

export interface PreviewResultMetadata extends FileMetadata {
  previewWidth: number;
  previewHeight: number,
  previewURL: string;
}

/**
 * Plugin tạo ảnh xem trước (thumbnail) và thông tin kích thước cho file hình ảnh.
 * 
 * Plugin này sẽ:
 * - Kiểm tra file có phải là hình ảnh không
 * - Tạo thumbnail với kích thước tùy chỉnh, giữ nguyên tỷ lệ khung hình
 * - Thêm metadata: kích thước ảnh, thumbnail blob, URL data của thumbnail và ảnh gốc
 * 
 * @implements {IFileProcessorPlugin}
 */
export class ImagePreviewPlugin implements IFileProcessorPlugin {
  /** Tên plugin */
  name = 'image-preview';

  /** Phiên bản plugin */
  version = "1.1.0";

  /** Lưu previews để dọn dẹp sau */
  private previews: {
    id: FileMetadata["id"];
    canvas: HTMLCanvasElement;
  }[]

  /** Cấu hình tùy chọn của plugin */
  private options: Required<PreviewConfig>;

  /**
   * Khởi tạo plugin với các tùy chọn cấu hình
   * 
   * @param options - Cấu hình tùy chọn cho thumbnail
   */
  constructor(options: PreviewConfig = {}) {
    this.options = {
      size: 200,
      quality: 0.8,
      ...options
    };
    this.previews = [];
  }

  /**
   * Chạy sau khi file đã được xử lý xong.
   * Tạo thumbnail và thêm thông tin kích thước vào metadata.
   * 
   * @param processed File đã được xử lý bởi các plugin trước
   * @returns {Promise<ProcessedFile>} File với metadata được bổ sung
   */
  async afterProcess(processed: ProcessedFile): Promise<ProcessedFile> {
    // Skip những file nào không phải hình
    if (!processed.original.type.startsWith('image/')) {
      return processed;
    }

    const size = this.options.size;
    const quality = this.options.quality;

    // Load hình ảnh
    const img = await this.loadImage(processed.blob);

    // Tạo hình preview (thumbnail)
    const canvas = document.createElement('canvas');

    // Lưu preview để cleanup sau
    this.previews.push({
      id: processed.metadata.id,
      canvas
    });

    // Tính kích thước (giữ tỉ lệ)
    const ratio = img.width / img.height;
    if (img.width > img.height) {
      canvas.width = size;
      canvas.height = size / ratio;
    } else {
      canvas.height = size;
      canvas.width = size * ratio;
    }

    // Vẽ lên canvas
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Chuyển sang data url
    const previewURL = canvas.toDataURL('image/jpeg', quality);

    return {
      ...processed,
      metadata: {
        ...processed.metadata,
        previewWidth: img.width,
        previewHeight: img.height,
        previewURL
      }
    };
  }
  /**
   * Dọn dẹp tất cả preview đã tạo và giải phóng bộ nhớ.
   * Gọi method này khi không cần preview nữa.
   */
  cleanup(): void {
    this.previews.forEach(preview => {
      const ctx = preview.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, preview.canvas.width, preview.canvas.height);
      }

      preview.canvas.width = 0;
      preview.canvas.height = 0;
    });

    this.previews = [];
  }
  /**
   * Xóa một preview cụ thể (nếu cần cleanup từng cái một).
   * 
   * @param index - Index của canvas cần xóa
   */
  cleanupPreview(id: FileMetadata["id"]): void {
    const targetIdx = this.previews.findIndex(preview => preview.id === id);
    if (!this.previews[targetIdx]) {
      console.error("Không tồn tại Preview nào có ID như bạn cung cấp!");
      return;
    }
    const preview = this.previews[targetIdx];
    const ctx = preview.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, preview.canvas.width, preview.canvas.height);
    }

    preview.canvas.width = 0;
    preview.canvas.height = 0;

    this.previews.splice(targetIdx, 1);
  }
  // ------------ HELPER FUNCTION ------------
  /**
  * Tải và trả về một đối tượng `HTMLImageElement` từ một `Blob`.
  * 
  * @param blob - Đối tượng `Blob` chứa dữ liệu hình ảnh.
  * @returns Một `Promise` sẽ hoàn thành với `HTMLImageElement` đã được tải xong .
  *
  */
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
}