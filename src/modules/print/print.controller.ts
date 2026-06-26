import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePrintQuoteDto } from './print.dto';
import type { UploadedFile } from './print.service';
import { PrintService } from './print.service';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB per file (matches the FE upload cap)

@ApiTags('print')
@Controller('print-quotes')
export class PrintController {
  constructor(private readonly print: PrintService) {}

  // multipart/form-data: `files` = the STL uploads, `payload` = JSON quote metadata.
  @Post()
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: MAX_FILE_BYTES } }))
  async create(
    @UploadedFiles() files: UploadedFile[],
    @Body('payload') payload?: string,
  ): Promise<{ id: string; quoteNumber: string }> {
    if (!payload) throw new BadRequestException('Missing quote payload.');
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new BadRequestException('Malformed quote payload.');
    }
    const dto = plainToInstance(CreatePrintQuoteDto, parsed);
    const errors = await validate(dto, { whitelist: true });
    if (errors.length > 0) throw new BadRequestException('Invalid quote payload.');
    return this.print.create(dto, files ?? []);
  }
}
