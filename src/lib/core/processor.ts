import type { FileProcessorConfig, IFileProcessor, IFileProcessorPlugin, PluginContext, ProcessedFile } from ".";
import { FileValidator } from "./validator";

/**
 * Class đảm nhận việc kiểm tra hợp lệ, xử lý file.
 * @implements {IFileProcessor}
 */
export class FileProcessor implements IFileProcessor {
  /**
    * Lưu cấu hình cho xử lý file và kiểm tra hợp lệ 
    * @private
  */
  private config: FileProcessorConfig;

  /**
    * Thể hiện của FileValidator
    * @private
  */
  private validator: FileValidator;

  /**
    * Chứa các plugins
    * @private
   */
  private plugins: IFileProcessorPlugin[];

  /**
    * Tạo một thể hiện FileProcessor.
    * Khởi tạo validator và chunker dựa trên cấu hình truyền vào.
    * @param {FileProcessorConfig} [config={}] - Tham số cấu hình (Optional).
    * @constructor
  */
  constructor(config: FileProcessorConfig = {}) {
    this.config = config;
    this.validator = new FileValidator(config);
    this.plugins = [];
  }
  /**
    * Tra cứu cấu hình hiện tại.
    * @returns {FileProcessorConfig} Một bản shallow copy của cấu hình hiện tại.
  */
  getConfig(): FileProcessorConfig {
    return { ...this.config };
  }
  /**
    * Cập nhật cấu hình mới và khởi tạo lại thuộc tính
    * @param {Partial<FileProcessorConfig>} newConfig - Cấu hình mới.
    * @returns {void}
  */
  updateConfig(newConfig: Partial<FileProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validator = new FileValidator(this.config);
  }
  /** */
  use(plugin: IFileProcessorPlugin): this {
    this.plugins.push(plugin);
    return this;
  }
  /** */
  removePlugin(name: string): this {
    this.plugins = this.plugins.filter(p => p.name !== name);
    return this;
  }
  /** */
  getPlugins(): IFileProcessorPlugin[] {
    return [...this.plugins];
  }
  /**
    * Xử lý một đối tượng File bằng cách kiểm tra hợp lệ.
    * @param {File} file - File cần được xử lý.
    * @returns {Promise<ProcessedFile>} Một promise chứa File đã xử lý.
    * @throws {Error} Nếu không hợp lệ hoặc kiểm tra hợp lệ thất bại.
  */
  async process(file: File): Promise<ProcessedFile> {
    try {
      // Trước khi kiểm tra hợp lệ
      await this.runHook('beforeValidation', file, this.config);

      // Kiểm tra hợp lệ
      const validationResult = this.validator.validateFile(file);

      // Sau khi kiểm tra hợp lệ
      await this.runHook('afterValidation', validationResult, file);

      if (!validationResult.valid) {
        throw new Error(`Kiểm tra hợp lệ thất bại: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Tiền-xử lý
      const processedBlob = await this.runHook('beforeProcess', file, this.config);

      const processed: ProcessedFile = {
        original: file,
        blob: processedBlob,
      };

      // Hậu-xử lý
      const finalProcessed = await this.runHook('afterProcess', processed);

      return finalProcessed
    }
    catch (error) {
      throw error;
    }
  }
  /**
    * Xử lý nhiều File.
    * @param {File[]} files - Mảng các File cần được xử lý.
    * @returns {Promise<ProcessedFile[]>} Một promise chứa mảng các File đã xử lý.
    * @throws {Error} Nếu không hợp lệ hoặc kiểm tra hợp lệ thất bại.
  */
  async processMany(files: File[]): Promise<ProcessedFile[]> {
    try {
      // Kiểm tra hợp lệ
      const validationResult = this.validator.validateFiles(files);

      if (!validationResult.valid) {
        throw new Error(`Kiểm tra hợp lệ thất bại: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      const processed = await Promise.all(
        files.map(file => this.process(file))
      );

      return processed;
    }
    catch (error) {
      throw error;
    }
  }
  private async runHook(hookName: keyof IFileProcessorPlugin, ...args: any[]): Promise<any> {
    let result = args[0]; // First arg is usually what gets transformed

    for (const plugin of this.plugins) {
      const hook = plugin[hookName] as any;
      if (hook) {
        const returned = await hook.apply(plugin, args);

        // If hook returns something, use it for next iteration
        if (returned !== undefined) {
          result = returned;
          args[0] = returned; // Update for next plugin
        }
      }
    }

    return result;
  }
  private async handleError(error: Error, context: PluginContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        await plugin.onError(error, context);
      }
    }
  }
}