-- CreateEnum
CREATE TYPE "public"."SalesChannel" AS ENUM ('APP', 'TAQUILLA');

-- AlterTable
ALTER TABLE "public"."PassengerAccount" ADD COLUMN     "createdByPanelUserId" UUID,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Reservation" ADD COLUMN     "salesChannel" "public"."SalesChannel" NOT NULL DEFAULT 'APP',
ADD COLUMN     "soldByPanelUserId" UUID;
