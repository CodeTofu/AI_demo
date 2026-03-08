import { Module } from '@nestjs/common';
import { HoldingsService } from './holdings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FundModule } from '../fund/fund.module';

@Module({
  imports: [PrismaModule, FundModule],
  providers: [HoldingsService],
  exports: [HoldingsService],
})
export class HoldingsModule {}
