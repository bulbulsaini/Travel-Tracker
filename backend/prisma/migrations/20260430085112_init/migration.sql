-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'HOD', 'DIRECTOR', 'TRAVEL_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TravelType" AS ENUM ('INTER_COMPANY', 'OUTSIDE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_HOD', 'PENDING_DIRECTOR', 'PENDING_TRAVEL_MANAGER', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "department" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "hodId" TEXT NOT NULL,
    "directorId" TEXT,
    "travelManagerId" TEXT,
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "travelType" "TravelType" NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "purposeOfVisit" TEXT NOT NULL,
    "accommodation" BOOLEAN NOT NULL DEFAULT false,
    "transportMode" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "additionalNotes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING_HOD',
    "hodComment" TEXT,
    "hodApprovedAt" TIMESTAMP(3),
    "directorComment" TEXT,
    "directorApprovedAt" TIMESTAMP(3),
    "travelManagerComment" TEXT,
    "travelManagerProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_travelManagerId_fkey" FOREIGN KEY ("travelManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
