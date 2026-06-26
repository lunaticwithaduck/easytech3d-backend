import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './infrastructure/email/email.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { CourierModule } from './modules/courier/courier.module';
import { CustomerModule } from './modules/customer/customer.module';
import { FormsModule } from './modules/forms/forms.module';
import { PrintModule } from './modules/print/print.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    StorageModule,
    CatalogModule,
    CartModule,
    CustomerModule,
    CheckoutModule,
    CourierModule,
    PrintModule,
    FormsModule,
    AdminModule,
  ],
})
export class AppModule {}
