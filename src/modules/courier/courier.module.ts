import { Module } from '@nestjs/common';
import { CourierController } from './courier.controller';
import { EcontService } from './econt.service';

@Module({
  controllers: [CourierController],
  providers: [EcontService],
})
export class CourierModule {}
