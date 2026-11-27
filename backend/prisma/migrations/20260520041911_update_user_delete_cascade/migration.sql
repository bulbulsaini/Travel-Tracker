-- DropForeignKey
ALTER TABLE "TravelRequest" DROP CONSTRAINT "TravelRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "TravelRequest" DROP CONSTRAINT "TravelRequest_hodId_fkey";

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
