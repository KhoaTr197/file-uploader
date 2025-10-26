// Core types
/**
 * Kết quả xác thực của một rule cụ thể
 */
export interface ValidationResult {
  /** File có hợp lệ theo rule này không */
  valid: boolean;
  /** Tên rule được kiểm tra */
  rule: string;
  /** Tên file gặp lỗi */
  file: string;
  /** Thông báo lỗi (nếu có), null nếu hợp lệ */
  message: string | null;
}

/**
 * Kết quả xác thực của một file riêng lẻ 
 */
export interface FileValidationResult {
  /** File có hợp lệ hoàn toàn không */
  valid: boolean;
  /** Danh sách các lỗi (nếu có) */
  errors: ValidationResult[];
  /** Danh sách kết quả kiểm tra */
  results: ValidationResult[];
  /** File được kiểm tra */
  file: File;
}

/** Kết quả xác thực của nhiều file */
export interface FilesValidationResult {
  /** Tất cả file có hợp lệ không */
  valid: boolean;
  /** Danh sách tất cả lỗi từ mọi file */
  errors: ValidationResult[];
  /** Kết quả chi tiết từng file */
  results: FileValidationResult[];
}

/** */
export interface FileMetadata {
  /**
     * UUID duy nhất cho mỗi file
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
  id: string;

  /**
   * Tên file gốc
   * @example "photo.jpg"
   */
  name: string;

  /**
   * Kích thước file (bytes)
   * @example 2048576 (2MB)
   */
  size: number;

  /**
   * MIME type của file
   * @example "image/jpeg", "application/pdf"
   */
  type: string;

  /**
   * Extension của file (lowercase, không có dấu chấm)
   * @example "jpg", "png", "pdf"
   */
  extension: string;

  /**
   * Timestamp khi file được modified lần cuối (từ File object)
   * @example 1698765432000
   */
  lastModified: number;
  /**
   * Custom metadata do plugins thêm vào.
   * Sử dụng index signature để cho phép plugins mở rộng metadata.
   */
  [key: string]: any;
}

/** File đã được xử lý */
export interface ProcessedFile {
  /** File gốc từ input */
  original: File;
  /** Blob đã xử lý (có thể là file gốc hoặc đã biến đổi) */
  blob: Blob;
  metadata: FileMetadata;
}

// Config types
// validator.ts
/**
 * Cấu hình cho File Validator
 */
export interface FileValidatorConfig extends FileProcessorConfig {
  /**
   * Danh sách validator tùy chỉnh
   * @example [{ type: "image/png", fn: customPngValidator }]
   */
  customValidators?: {
    /** MIME type cần áp dụng validator */
    type: File["type"];
    /** Hàm validator tùy chỉnh */
    fn: CustomValidator;
  }[]
}

// processor.ts
export interface FileProcessorConfig {
  /**
   * Kích thước file tối đa cho phép (bytes)
   * @default 10485760 (10 MB)
   */
  maxSize?: number;

  /**
   * Kích thước file tối thiểu (bytes)
   * @default 0
   */
  minSize?: number;

  /**
   * Danh sách MIME types được phép
   * @example ['image/*', 'application/pdf']
   */
  allowedTypes?: File["type"][];

  /**
   * Danh sách phần mở rộng được phép
   * @example ['jpg', 'png', 'pdf']
   */
  allowedExtensions?: string[];

  /**
   * Số lượng file tối đa được phép upload
   * @default 1
   */
  maxFiles?: number;

  /**
   * Bật/tắt kiểm tra tên file
   * @default true
   */
  validateFileName?: boolean;
}

// Callback types
/**
 * Hàm validator tùy chỉnh
 * @param file File cần kiểm tra
 * @returns `true` nếu hợp lệ, `false` hoặc chuỗi lỗi nếu không hợp lệ
 */
export type CustomValidator = (file: File) => boolean | string | Promise<boolean | string>;

/**
 * Hàm kiểm tra một rule xác thực
 * @param file File cần kiểm tra
 * @param config Cấu hình
 * @returns {boolean} `true` nếu hợp lệ, `false` nếu không hợp lệ
 */
export type ValidationRuleFunction = (file: File, config: Required<FileValidatorConfig>) => boolean;

/**
 * Hàm tạo thông báo lỗi cho rule
 * @param file File vi phạm
 * @param config Cấu hình đã chuẩn hoá
 * @returns Chuỗi thông báo lỗi
 */
export type ValidationMessageFunction = (file: File, config: Required<FileValidatorConfig>) => string;


// Interfaces
/**
 * Interface chung cho các thành phần có thể cập nhật cấu hình
 */
export interface IConfigurable {
  /**
   * Cập nhật cấu hình mới
   * @param config Cấu hình mới
   */
  updateConfig(config: ValidatorConfig): void;
}

// validator.ts
/** Interface cho một rule xác thực */
export interface IValidationRule {
  /** Tên duy nhất của rule */
  name: string;
  /** Hàm kiểm tra logic */
  validate: ValidationRuleFunction;
  /** Hàm tạo thông báo lỗi */
  message: ValidationMessageFunction;
}

/** Interface cho File Validator */
export interface IFileValidator extends IConfigurable {
  /**
   * Xác thực một file
   * @param file File cần kiểm tra
   * @returns Kết quả xác thực chi tiết
   */
  validateFile(file: File): FileValidationResult
  /**
   * Xác thực nhiều file
   * @param files Danh sách file
   * @returns Kết quả tổng hợp
   */
  validateFiles(files: File[]): FilesValidationResult;
}

// processor.ts
/** Interface cho File Processor */
export interface IFileProcessor extends IConfigurable { }

// Plugins
/**
 * Interface định nghĩa cấu trúc của một plugin trong hệ thống xử lý file.
 * Các plugin có thể can thiệp vào nhiều giai đoạn của quy trình xử lý file:
 * - Trước/sau khi validate
 * - Trước/sau khi xử lý file
 * - Xử lý lỗi
 *
 * @remarks
 * Tất cả các phương thức đều là tùy chọn (optional). Plugin chỉ cần triển khai
 * những phương thức mà nó muốn can thiệp.
 *
 * @example
 * ```ts
 * const imageResizerPlugin: IFileProcessorPlugin = {
 *   name: 'image-resizer',
 *   version: '1.0.0',
 *
 *   async beforeProcess(file, config) {
 *     if (file.type.startsWith('image/')) {
 *       return await resizeImage(file, { width: 800 });
 *     }
 *     return file;
 *   },
 *
 *   onError(error, context) {
 *     console.error('Plugin error:', error.message, context);
 *   }
 * };
 * ```
 */

export interface PluginContext {
  file: ProcessedFile;
  config: FileProcessorConfig;
  metadata: Map<string, any>;
}

export interface IFileProcessorPlugin {
  /**
   * Tên duy nhất của plugin. Dùng để định danh và debug.
   *
   * @example
   * "image-compressor"
   * "pdf-watermark"
   */
  name: string;

  /**
   * Phiên bản của plugin (theo chuẩn semantic versioning).
   * Giúp theo dõi và quản lý các phiên bản plugin.
   *
   * @default undefined
   * @example
   * "2.1.0"
   */
  version?: string;

  /**
   * Hook được gọi **trước khi validate** một file.
   *
   * @param file - File gốc đang được xử lý
   * @param config - Cấu hình toàn cục của FileProcessor
   * @returns Promise<void> hoặc void
   */
  beforeValidation?(file: File, config: FileProcessorConfig): Promise<void> | void;

  /**
   * Hook được gọi **sau khi validate** một file.
   *
   * @param result - Kết quả validate của file
   * @param file - File đã được validate
   * @returns Promise<void> hoặc void
   */
  afterValidation?(result: FileValidationResult, file: File): Promise<void> | void;

  /**
   * Hook được gọi **trước khi xử lý** file.
   * Có thể trả về:
   * - File mới (đã được biến đổi)
   * - Blob (nếu cần chuyển đổi định dạng)
   *
   * @param file - File gốc
   * @param config - Cấu hình xử lý
   * @returns File, Blob hoặc Promise của chúng
   *
   * @example
   * return await compressImage(file); // trả về File nhỏ hơn
   */
  beforeProcess?(file: File, config: FileProcessorConfig): Promise<File | Blob> | File | Blob;

  /**
   * Hook được gọi **sau khi xử lý** file thành công.
   *
   * @param processed - File đã được xử lý (có thêm thông tin như URL, ID, v.v.)
   * @returns ProcessedFile đã được chỉnh sửa hoặc nguyên bản
   */
  afterProcess?(processed: ProcessedFile): Promise<ProcessedFile> | ProcessedFile;

  /**
   * Hook xử lý lỗi xảy ra trong quá trình xử lý.
   * Có thể:
   * - Gửi log đến server
   * - Hiển thị thông báo người dùng
   * - Thử phục hồi
   *
   * @param error - Lỗi xảy ra
   * @param context - Ngữ cảnh lỗi:
   *                  - PluginContext: lỗi ở mức file đơn
   */
  onError?(error: Error, context: PluginContext): Promise<void> | void;
}