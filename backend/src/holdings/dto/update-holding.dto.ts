import { IsNumber } from 'class-validator';

/** 与 AI 记录持仓一致：当前市值 + 持仓收益，后端反推成本与成本单价 */
export class UpdateHoldingDto {
  @IsNumber()
  currentValue: number;

  @IsNumber()
  profitLoss: number;
}
