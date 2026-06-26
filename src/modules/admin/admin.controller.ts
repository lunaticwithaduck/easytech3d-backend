import { Body, Controller, Get, Param, Patch, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { OrderStatusDto, QuoteStatusDto } from './admin.dto';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('orders')
  orders() {
    return this.admin.listOrders();
  }

  @Get('print-quotes')
  quotes() {
    return this.admin.listQuotes();
  }

  @Get('print-quotes/:quoteId/files/:fileId')
  async quoteFile(
    @Param('quoteId') quoteId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { fileName, buffer } = await this.admin.getQuoteFile(quoteId, fileId);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Get('messages')
  messages() {
    return this.admin.listMessages();
  }

  @Get('subscribers')
  subscribers() {
    return this.admin.listSubscribers();
  }

  @Get('back-in-stock')
  backInStock() {
    return this.admin.listBackInStock();
  }

  @Patch('orders/:id/status')
  setOrderStatus(@Param('id') id: string, @Body() dto: OrderStatusDto) {
    return this.admin.setOrderStatus(id, dto.status);
  }

  @Patch('print-quotes/:id/status')
  setQuoteStatus(@Param('id') id: string, @Body() dto: QuoteStatusDto) {
    return this.admin.setQuoteStatus(id, dto.status);
  }
}
