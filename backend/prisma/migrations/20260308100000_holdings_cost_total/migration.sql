-- AlterTable: 持仓只记录总成本与成本单价，不记录份额
ALTER TABLE "holdings" ADD COLUMN IF NOT EXISTS "costTotal" DOUBLE PRECISION;

-- 若表内已有 amount 数据，先迁移：costTotal = amount * costPrice
UPDATE "holdings" SET "costTotal" = "amount" * "costPrice" WHERE "costTotal" IS NULL;

-- 确保 costTotal 非空（新表或已全量迁移后）
ALTER TABLE "holdings" ALTER COLUMN "costTotal" SET NOT NULL;

-- 删除份额列
ALTER TABLE "holdings" DROP COLUMN IF EXISTS "amount";
