import { Injectable, Logger } from '@nestjs/common';
import type { ShopOrder } from '@/modules/checkout/checkout.types';

interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export interface PrintQuoteEmail {
  quoteNumber: string;
  name: string;
  email: string;
  phone: string;
  material: string;
  color: string;
  infill: number;
  qty: number;
  totalPrice: number;
  fileNames: string[];
  dims: string;
  totalWeightG: number;
  notes?: string | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly from = process.env.EMAIL_FROM || 'EasyTech3D <no-reply@easytech3d.com>';
  private readonly shop = process.env.SHOP_EMAIL || 'easytech3dbg@gmail.com';

  /**
   * Transport seam. In dev we log the email (no provider keys needed). Swap a real provider here
   * (Resend / SMTP) when EMAIL_* env is configured. Best-effort — never throws.
   */
  private async deliver(email: OutboundEmail): Promise<void> {
    try {
      this.logger.log(`EMAIL → ${email.to} · ${email.subject}`);
      this.logger.debug(
        `\nfrom: ${this.from}\nto: ${email.to}${email.replyTo ? `\nreply-to: ${email.replyTo}` : ''}\nsubject: ${email.subject}\n\n${email.text}\n`,
      );
    } catch (e) {
      this.logger.error(`email delivery failed: ${String(e)}`);
    }
  }

  private lv(cents: number): string {
    return `${(cents / 100).toFixed(2)} лв`;
  }

  async orderConfirmation(order: ShopOrder): Promise<void> {
    const lines = order.items
      .map(
        (i) =>
          `  • ${i.productTitle}${i.variantTitle !== 'Default Title' ? ` (${i.variantTitle})` : ''} ×${i.quantity} — ${this.lv(i.lineTotal)}`,
      )
      .join('\n');
    await this.deliver({
      to: order.email,
      subject: `Поръчка ${order.orderNumber} — EasyTech3D`,
      text:
        `Здравейте, ${order.firstName}!\n\nБлагодарим за поръчката Ви ${order.orderNumber}.\n\n${lines}\n\n` +
        `Междинна сума: ${this.lv(order.subtotal)}\nДоставка: ${order.shippingCost === 0 ? 'Безплатно' : this.lv(order.shippingCost)}\nОбщо: ${this.lv(order.total)}\n\n` +
        `Доставка до: ${order.shipping.postalCode} ${order.shipping.city}\nПлащане: ${order.paymentMethod === 'COD' ? 'Наложен платеж' : 'Карта'}\n\nЕкипът на EasyTech3D`,
    });
  }

  async newOrderAlert(order: ShopOrder): Promise<void> {
    await this.deliver({
      to: this.shop,
      replyTo: order.email,
      subject: `Нова поръчка ${order.orderNumber} (${this.lv(order.total)})`,
      text:
        `Нова поръчка ${order.orderNumber}\nКлиент: ${order.firstName} ${order.lastName} · ${order.email} · ${order.phone}\n` +
        `Общо: ${this.lv(order.total)} · ${order.paymentMethod}\nАдрес: ${order.shipping.address1}, ${order.shipping.postalCode} ${order.shipping.city}`,
    });
  }

  async printQuoteAlert(q: PrintQuoteEmail): Promise<void> {
    await this.deliver({
      to: this.shop,
      replyTo: q.email,
      subject: `Нова 3D заявка ${q.quoteNumber} (${q.totalPrice.toFixed(2)} лв)`,
      text:
        `3D Принт заявка ${q.quoteNumber}\nКлиент: ${q.name} · ${q.email} · ${q.phone}\n` +
        `Файлове: ${q.fileNames.join(', ')}\nМатериал: ${q.material} / ${q.color}\n` +
        `Запълване: ${q.infill}% · Размери: ${q.dims} mm · Тегло: ${q.totalWeightG} г\n` +
        `Количество: ${q.qty} · Цена: ${q.totalPrice.toFixed(2)} лв${q.notes ? `\nБележки: ${q.notes}` : ''}`,
    });
  }

  async contactMessage(msg: { name: string; email: string; message: string }): Promise<void> {
    await this.deliver({
      to: this.shop,
      replyTo: msg.email,
      subject: `Запитване от ${msg.name}`,
      text: `${msg.name} <${msg.email}>:\n\n${msg.message}`,
    });
  }
}
