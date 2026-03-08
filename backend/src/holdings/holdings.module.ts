import { Module } from '@nestjs/common';
import { HoldingsController } from './holdings.controller';
import { HoldingsService } from './holdings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FundModule } from '../fund/fund.module';

@Module({
  imports: [PrismaModule, FundModule],
  controllers: [HoldingsController],
  providers: [HoldingsService],
  exports: [HoldingsService],
})
export class HoldingsModule {}
