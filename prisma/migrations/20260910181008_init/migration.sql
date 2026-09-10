-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDIENTE_PAGO', 'EN_VALIDACION', 'ABONADA', 'PAGADA', 'PAGO_EN_SITIO', 'LIBERADA', 'CANCELADA', 'ABORDADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."DepartureStatus" AS ENUM ('PROGRAMADA', 'MANIFIESTO_CERRADO', 'EN_RUTA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "public"."PaymentKind" AS ENUM ('DIGITAL', 'FISICO');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'VES', 'COP', 'USDT');

-- CreateEnum
CREATE TYPE "public"."ProofStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CEDULA', 'PERMISO_VIAJE');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('ENCOLADO', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "public"."WaitlistStatus" AS ENUM ('EN_ESPERA', 'NOTIFICADO', 'CONVERTIDO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "public"."PanelRole" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "public"."AttendanceResponse" AS ENUM ('CONFIRMA', 'INCONVENIENTE');

-- CreateEnum
CREATE TYPE "public"."ActorType" AS ENUM ('PASAJERO', 'PANEL', 'SISTEMA');

-- CreateTable
CREATE TABLE "public"."PassengerAccount" (
    "id" UUID NOT NULL,
    "idNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PassengerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PassengerDocument" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByPanelUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PassengerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PassengerSession" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PassengerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Agency" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PanelUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."PanelRole" NOT NULL,
    "agencyId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PanelUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PanelSession" (
    "id" UUID NOT NULL,
    "panelUserId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PanelSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Route" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "fareUsd" DECIMAL(10,2) NOT NULL,
    "meetingPoint" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "travelTips" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Departure" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "departsAt" TIMESTAMPTZ(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "public"."DepartureStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "manifestClosedAt" TIMESTAMPTZ(3),
    "manifestClosedByPanelUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Departure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethod" (
    "id" UUID NOT NULL,
    "agencyId" UUID,
    "name" TEXT NOT NULL,
    "kind" "public"."PaymentKind" NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "details" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExchangeRate" (
    "id" UUID NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "rateFromUsd" DECIMAL(18,6) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "createdByPanelUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepartureTax" (
    "id" UUID NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "createdByPanelUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DepartureTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "departureId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "passengerCount" INTEGER NOT NULL,
    "policiesAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "fareUsd" DECIMAL(10,2) NOT NULL,
    "fareTotalUsd" DECIMAL(10,2) NOT NULL,
    "taxPerPassengerUsd" DECIMAL(10,2) NOT NULL,
    "taxTotalUsd" DECIMAL(10,2) NOT NULL,
    "totalUsd" DECIMAL(10,2) NOT NULL,
    "paidUsd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" "public"."Currency" NOT NULL,
    "exchangeRateUsed" DECIMAL(18,6) NOT NULL,
    "amountInCurrency" DECIMAL(18,2) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "paidAt" TIMESTAMPTZ(3),
    "reconfirmedAt" TIMESTAMPTZ(3),
    "attendanceResponse" "public"."AttendanceResponse",
    "attendanceRespondedAt" TIMESTAMPTZ(3),
    "boardedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "manualContactRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Passenger" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "isHolder" BOOLEAN NOT NULL DEFAULT false,
    "boardedAt" TIMESTAMPTZ(3),
    "boardedByPanelUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentProof" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "status" "public"."ProofStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reviewedByPanelUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashPayment" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "public"."Currency" NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "collectedByPanelUserId" UUID NOT NULL,
    "collectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CashPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WaitlistEntry" (
    "id" UUID NOT NULL,
    "departureId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "status" "public"."WaitlistStatus" NOT NULL DEFAULT 'EN_ESPERA',
    "notifiedAt" TIMESTAMPTZ(3),
    "claimToken" TEXT,
    "claimExpiresAt" TIMESTAMPTZ(3),
    "convertedReservationId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TripLog" (
    "id" UUID NOT NULL,
    "departureId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "boardingStartedAt" TIMESTAMPTZ(3),
    "departedAt" TIMESTAMPTZ(3),
    "arrivedAt" TIMESTAMPTZ(3),
    "passengerCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TripLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutboundMessage" (
    "id" UUID NOT NULL,
    "reservationId" UUID,
    "waitlistEntryId" UUID,
    "phone" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."MessageStatus" NOT NULL DEFAULT 'ENCOLADO',
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledFor" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundEvent" (
    "id" UUID NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" UUID NOT NULL,
    "actorType" "public"."ActorType" NOT NULL,
    "actorPanelUserId" UUID,
    "actorAccountId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB NOT NULL DEFAULT '{}',
    "after" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassengerAccount_idNumber_key" ON "public"."PassengerAccount"("idNumber");

-- CreateIndex
CREATE INDEX "PassengerAccount_createdAt_idx" ON "public"."PassengerAccount"("createdAt");

-- CreateIndex
CREATE INDEX "PassengerAccount_fullName_idx" ON "public"."PassengerAccount"("fullName");

-- CreateIndex
CREATE INDEX "PassengerDocument_accountId_type_idx" ON "public"."PassengerDocument"("accountId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PassengerSession_tokenHash_key" ON "public"."PassengerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PassengerSession_accountId_idx" ON "public"."PassengerSession"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_taxId_key" ON "public"."Agency"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelUser_email_key" ON "public"."PanelUser"("email");

-- CreateIndex
CREATE INDEX "PanelUser_agencyId_role_idx" ON "public"."PanelUser"("agencyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PanelSession_tokenHash_key" ON "public"."PanelSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PanelSession_panelUserId_idx" ON "public"."PanelSession"("panelUserId");

-- CreateIndex
CREATE INDEX "Vehicle_agencyId_active_idx" ON "public"."Vehicle"("agencyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_agencyId_plate_key" ON "public"."Vehicle"("agencyId", "plate");

-- CreateIndex
CREATE INDEX "Driver_agencyId_active_idx" ON "public"."Driver"("agencyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_agencyId_idNumber_key" ON "public"."Driver"("agencyId", "idNumber");

-- CreateIndex
CREATE INDEX "Route_agencyId_active_idx" ON "public"."Route"("agencyId", "active");

-- CreateIndex
CREATE INDEX "Departure_departsAt_status_idx" ON "public"."Departure"("departsAt", "status");

-- CreateIndex
CREATE INDEX "Departure_routeId_departsAt_idx" ON "public"."Departure"("routeId", "departsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Departure_vehicleId_departsAt_key" ON "public"."Departure"("vehicleId", "departsAt");

-- CreateIndex
CREATE INDEX "PaymentMethod_active_sortOrder_idx" ON "public"."PaymentMethod"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "ExchangeRate_currency_effectiveFrom_idx" ON "public"."ExchangeRate"("currency", "effectiveFrom");

-- CreateIndex
CREATE INDEX "DepartureTax_effectiveFrom_idx" ON "public"."DepartureTax"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "public"."Reservation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_publicToken_key" ON "public"."Reservation"("publicToken");

-- CreateIndex
CREATE INDEX "Reservation_departureId_status_idx" ON "public"."Reservation"("departureId", "status");

-- CreateIndex
CREATE INDEX "Reservation_accountId_createdAt_idx" ON "public"."Reservation"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "public"."Reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Reservation_paidAt_idx" ON "public"."Reservation"("paidAt");

-- CreateIndex
CREATE INDEX "Passenger_reservationId_idx" ON "public"."Passenger"("reservationId");

-- CreateIndex
CREATE INDEX "Passenger_idNumber_idx" ON "public"."Passenger"("idNumber");

-- CreateIndex
CREATE INDEX "PaymentProof_status_createdAt_idx" ON "public"."PaymentProof"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentProof_reservationId_idx" ON "public"."PaymentProof"("reservationId");

-- CreateIndex
CREATE INDEX "CashPayment_reservationId_idx" ON "public"."CashPayment"("reservationId");

-- CreateIndex
CREATE INDEX "CashPayment_collectedAt_idx" ON "public"."CashPayment"("collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_reservationId_key" ON "public"."Ticket"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_claimToken_key" ON "public"."WaitlistEntry"("claimToken");

-- CreateIndex
CREATE INDEX "WaitlistEntry_departureId_status_createdAt_idx" ON "public"."WaitlistEntry"("departureId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_accountId_idx" ON "public"."WaitlistEntry"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TripLog_departureId_key" ON "public"."TripLog"("departureId");

-- CreateIndex
CREATE INDEX "TripLog_driverId_idx" ON "public"."TripLog"("driverId");

-- CreateIndex
CREATE INDEX "TripLog_departedAt_idx" ON "public"."TripLog"("departedAt");

-- CreateIndex
CREATE INDEX "TripLog_arrivedAt_idx" ON "public"."TripLog"("arrivedAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_status_scheduledFor_idx" ON "public"."OutboundMessage"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "OutboundMessage_reservationId_idx" ON "public"."OutboundMessage"("reservationId");

-- CreateIndex
CREATE INDEX "OutboundMessage_providerMessageId_idx" ON "public"."OutboundMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundEvent_providerEventId_key" ON "public"."InboundEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "public"."AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorPanelUserId_idx" ON "public"."AuditLog"("actorPanelUserId");

-- AddForeignKey
ALTER TABLE "public"."PassengerDocument" ADD CONSTRAINT "PassengerDocument_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."PassengerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PassengerSession" ADD CONSTRAINT "PassengerSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."PassengerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PanelUser" ADD CONSTRAINT "PanelUser_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PanelSession" ADD CONSTRAINT "PanelSession_panelUserId_fkey" FOREIGN KEY ("panelUserId") REFERENCES "public"."PanelUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Route" ADD CONSTRAINT "Route_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Departure" ADD CONSTRAINT "Departure_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "public"."Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Departure" ADD CONSTRAINT "Departure_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Departure" ADD CONSTRAINT "Departure_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."PassengerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "public"."Departure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Passenger" ADD CONSTRAINT "Passenger_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentProof" ADD CONSTRAINT "PaymentProof_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentProof" ADD CONSTRAINT "PaymentProof_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashPayment" ADD CONSTRAINT "CashPayment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "public"."Departure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."PassengerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_convertedReservationId_fkey" FOREIGN KEY ("convertedReservationId") REFERENCES "public"."Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripLog" ADD CONSTRAINT "TripLog_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "public"."Departure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripLog" ADD CONSTRAINT "TripLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripLog" ADD CONSTRAINT "TripLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutboundMessage" ADD CONSTRAINT "OutboundMessage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutboundMessage" ADD CONSTRAINT "OutboundMessage_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "public"."WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Las plantillas programadas se envían una sola vez por reserva, aunque un
-- barrido corra dos veces. Prisma no expresa índices parciales, va en SQL.
CREATE UNIQUE INDEX "OutboundMessage_once_per_reservation"
  ON "OutboundMessage" ("reservationId", "templateKey")
  WHERE "reservationId" IS NOT NULL
    AND "templateKey" IN ('recordatorio_24h', 'reconfirmacion_pago_sitio', 'confirmacion_2h', 'ticket_emitido');

-- La bitácora es de solo inserción: ni la aplicación ni un operador con acceso
-- directo pueden alterar el historial.
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog es de solo inserción';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
