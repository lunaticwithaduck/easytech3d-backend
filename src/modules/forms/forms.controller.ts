import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BackInStockDto, ContactDto, NewsletterDto } from './forms.dto';
import { FormsService } from './forms.service';

@ApiTags('forms')
@Controller()
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Post('newsletter')
  newsletter(@Body() dto: NewsletterDto): Promise<{ ok: true }> {
    return this.forms.subscribe(dto);
  }

  @Post('contact')
  contact(@Body() dto: ContactDto): Promise<{ ok: true }> {
    return this.forms.contact(dto);
  }

  @Post('back-in-stock')
  backInStock(@Body() dto: BackInStockDto): Promise<{ ok: true }> {
    return this.forms.backInStock(dto);
  }
}
