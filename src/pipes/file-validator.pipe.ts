import {
  Injectable,
  HttpStatus,
  PipeTransform,
  HttpException,
} from '@nestjs/common';

export interface FileValidationOptions {
  errorHttpStatusCode?: HttpStatus;
  fileIsRequired?: boolean;
  maxSizeConfig?: {
    size: number; // in bytes
    errorMessage?: string;
  };
  fileTypeConfig?: {
    type: RegExp;
    errorMessage?: string;
  };
}

@Injectable()
export class FileValidatorPipe implements PipeTransform {
  constructor(private options: FileValidationOptions) {
    if (options.maxSizeConfig?.size <= 0) {
      throw new Error('Value of "size" must be greater than 0');
    }

    if (!options.errorHttpStatusCode) {
      this.options.errorHttpStatusCode = HttpStatus.BAD_REQUEST;
    }

    if (options.fileIsRequired === undefined) {
      this.options.fileIsRequired = true;
    }
  }

  transform(file: Express.Multer.File) {
    const {
      maxSizeConfig,
      fileIsRequired,
      fileTypeConfig,
      errorHttpStatusCode,
    } = this.options;

    if (!file) {
      if (fileIsRequired) {
        throw new HttpException(
          'File is required',
          this.options.errorHttpStatusCode,
        );
      }

      return;
    }

    if (this.options.fileTypeConfig) {
      if (!this.options.fileTypeConfig.errorMessage) {
        this.options.fileTypeConfig.errorMessage = `Validation failed (expected type is ${this.options.fileTypeConfig.type})`;
      }

      if (!fileTypeConfig.type.test(file.mimetype)) {
        throw new HttpException(
          fileTypeConfig.errorMessage,
          errorHttpStatusCode,
        );
      }
    }

    if (this.options.maxSizeConfig) {
      if (!this.options.maxSizeConfig.errorMessage) {
        this.options.maxSizeConfig.errorMessage = `Validation failed (expected size is less than ${this.options.maxSizeConfig.size} bytes)`;
      }

      if (file.size > maxSizeConfig.size) {
        throw new HttpException(
          maxSizeConfig.errorMessage,
          errorHttpStatusCode,
        );
      }
    }

    return file;
  }
}
