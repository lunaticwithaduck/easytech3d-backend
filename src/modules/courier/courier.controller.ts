import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type EcontCity, type EcontOffice, EcontService } from './econt.service';

// Courier office lookup. Econt's nomenclature API is public, so we proxy + cache it here.
// Speedy needs a contract account (SPEEDY_USERNAME/PASSWORD) — wired as a seam when creds exist.
@ApiTags('courier')
@Controller('courier')
export class CourierController {
  constructor(private readonly econt: EcontService) {}

  @Get('econt/cities')
  cities(): Promise<EcontCity[]> {
    return this.econt.cities();
  }

  @Get('econt/offices')
  offices(@Query('city') city?: string): Promise<EcontOffice[]> {
    return this.econt.offices(city);
  }
}
