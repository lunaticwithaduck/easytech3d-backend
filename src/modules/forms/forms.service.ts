import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { EmailService } from '@/infrastructure/email/email.service';
import type { BackInStockDto, ContactDto, NewsletterDto } from './forms.dto';

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async subscribe(dto: NewsletterDto): Promise<{ ok: true }> {
    await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      create: { email: dto.email, firstName: dto.firstName ?? null, lastName: dto.lastName ?? null },
      update: { firstName: dto.firstName ?? null, lastName: dto.lastName ?? null },
    });
    return { ok: true };
  }

  async contact(dto: ContactDto): Promise<{ ok: true }> {
    await this.prisma.contactMessage.create({ data: { name: dto.name, email: dto.email, message: dto.message } });
    await this.email.contactMessage(dto);
    return { ok: true };
  }

  async backInStock(dto: BackInStockDto): Promise<{ ok: true }> {
    await this.prisma.backInStockRequest.create({
      data: { email: dto.email, productHandle: dto.productHandle, variantId: dto.variantId ?? null },
    });
    return { ok: true };
  }
}
