import type {
  IFileValidator,
  IValidationRule,
  FilesValidationResult,
  FileValidationResult,
  ValidationResult,
  FileValidatorConfig
} from ".";
import { utils } from "./utils";

export class ValidationRule implements IValidationRule {
  public name: IValidationRule["name"];
  public validate: IValidationRule["validate"];
  public message: IValidationRule["message"];

  constructor({
    name,
    validate,
    message
  }: IValidationRule) {
    this.name = name;
    this.validate = validate;
    this.message = message;
  }

  check(file: File, config: Required<FileValidatorConfig>): ValidationResult {
    const result = this.validate(file, config);
    return {
      file: file.name,
      valid: result,
      rule: this.name,
      message: result ? null : this.message(file, config)
    };
  }
}

export class FileValidator implements IFileValidator {
  private config: Required<FileValidatorConfig>;
  private rules: ValidationRule[];

  constructor(config: FileValidatorConfig) {
    this.config = {
      maxSize: config.maxSize || 10 * (1024 ** 2), // 10MB default
      minSize: config.minSize || 0,
      allowedTypes: config.allowedTypes || [],
      allowedExtensions: config.allowedExtensions || [],
      maxFiles: config.maxFiles || 1,
      validateFileName: config.validateFileName || true,
      customValidators: config.customValidators || []
    };

    this.rules = this._initRules();
  }
  updateConfig(newConfig: FileValidatorConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  _initRules() {
    return [
      // fileSize
      new ValidationRule({
        name: 'fileSize',
        validate: (file, config) => file.size <= config.maxSize && file.size >= config.minSize,
        message: (_, config) => `Kích thước file phải nằm trong khoảng từ ${utils.formatBytes(config.minSize)} đến ${utils.formatBytes(config.maxSize)}`
      }),
      // fileType
      new ValidationRule({
        name: 'fileType',
        validate: (file, config) => {
          if (config.allowedTypes.length === 0) return true;
          return config.allowedTypes.some(type => {
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.replace('/*', ''));
            }
            return file.type === type;
          });
        },
        message: (file, config) => `Loại file "${file.type}" không hợp lệ. Các loại được chấp nhận: ${config.allowedTypes.join(', ')}`
      }),
      // fileExtension
      new ValidationRule({
        name: "fileExtension",
        validate: (file, config) => {
          if (config.allowedExtensions.length === 0) return true;
          const ext = utils.getExtension(file.name);
          return config.allowedExtensions.map(e => e.toLowerCase()).includes(ext);
        },
        message: (_, config) => `Phần định dạng file không hợp lệ. Chỉ chấp nhận: ${config.allowedExtensions.join(', ')}`
      }),
      // fileName
      new ValidationRule({
        name: "fileName",
        validate: (file, config) => {
          if (!config.validateFileName) return true;
          const invalidChars = /[<>:"|?*\x00-\x1F]/;
          return !invalidChars.test(file.name) && file.name.length > 0 && file.name.length < 255;
        },
        message: () => 'Tên file không hợp lệ. Chứa ký tự không cho phép hoặc độ dài không phù hợp.'
      })
    ]
  }
  validateFile(file: File) {
    const errors: ValidationResult[] = [];

    for (const rule of this.rules) {
      const result = rule.check(file, this.config);
      if (!result.valid) {
        errors.push({
          valid: false,
          rule: result.rule,
          message: result.message,
          file: file.name
        });
      }
    }

    // Custom Validators
    for (const validator of this.config.customValidators) {
      if (file.type !== validator.type) break;
      const result = validator.fn(file);
      if (result !== true) {
        errors.push({
          valid: false,
          rule: 'custom',
          message: typeof result === 'string' ? result : 'Kiểm tra hợp lệ tùy chỉnh thất bại',
          file: file.name
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      file
    } as FileValidationResult;
  }
  /** */
  validateFiles(files: File[]) {
    const fileArray = Array.from(files);

    if (fileArray.length > this.config.maxFiles) {
      return {
        valid: false,
        errors: [{
          rule: 'maxFiles',
          message: `Chỉ được chọn tối đa ${this.config.maxFiles} file. Bạn đã chọn ${fileArray.length} file.`,
          file: "none",
        }],
      } as FilesValidationResult;
    }

    const results = fileArray.map(file => this.validateFile(file));
    const allValid = results.every(r => r.valid);
    const allErrors = results.flatMap(r => r.errors);

    return {
      valid: allValid,
      errors: allErrors,
      results
    } as FilesValidationResult;
  }
}