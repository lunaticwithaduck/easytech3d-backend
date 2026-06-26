import { Injectable } from '@nestjs/common';
import { EmailService } from '@/infrastructure/email/email.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import type { CreatePrintQuoteDto } from './print.dto';

// Minimal shape of a multer upload — avoids depending on @types/multer for the Express.Multer namespace.
export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class PrintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly storage: StorageService,
  ) {}

  async create(
    dto: CreatePrintQuoteDto,
    files: UploadedFile[] = [],
  ): Promise<{ id: string; quoteNumber: string }> {
    const quote = await this.prisma.printQuote.create({
      data: {
        name: dto.customer.name,
        email: dto.customer.email,
        phone: dto.customer.phone,
        fileNames: dto.fileNames,
        material: dto.material,
        color: dto.color,
        infill: dto.infill,
        totalVolumeCm3: dto.totalVolumeCm3,
        totalWeightG: dto.totalWeightG,
        dims: dto.dims,
        qty: dto.qty,
        unitPriceCents: Math.round(dto.unitPrice * 100),
        totalPriceCents: Math.round(dto.totalPrice * 100),
        notes: dto.notes ?? null,
      },
    });
    const quoteNumber = `PQ-${String(quote.quoteNumber).padStart(5, '0')}`;

    // Persist the uploaded STL bytes to storage and record each file against the quote.
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safe = file.originalname.replace(/[^\w.-]+/g, '_').slice(-120) || `model-${i}.stl`;
      const key = `print-quotes/${quote.id}/${i}-${safe}`;
      await this.storage.save(key, file.buffer);
      await this.prisma.printQuoteFile.create({
        data: {
          quoteId: quote.id,
          fileName: file.originalname,
          storageKey: key,
          sizeBytes: file.size,
        },
      });
    }

    await this.email
      .printQuoteAlert({
        quoteNumber,
        name: dto.customer.name,
        email: dto.customer.email,
        phone: dto.customer.phone,
        material: dto.material,
        color: dto.color,
        infill: dto.infill,
        qty: dto.qty,
        totalPrice: dto.totalPrice,
        fileNames: dto.fileNames,
        dims: dto.dims,
        totalWeightG: dto.totalWeightG,
        notes: dto.notes,
      })
      .catch(() => undefined);
    return { id: quote.id, quoteNumber };
  }
}
