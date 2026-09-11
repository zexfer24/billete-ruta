-- AlterTable: se agregan admitiendo nulos para poder rellenarlas antes de exigirlas.
ALTER TABLE "public"."PassengerAccount" ADD COLUMN     "givenNames" TEXT,
ADD COLUMN     "surnames" TEXT;

-- Backfill: primera palabra de "fullName" recortado para los nombres, el resto para
-- los apellidos (cadena vacía si no hay resto).
UPDATE "public"."PassengerAccount"
SET
  "givenNames" = split_part(trim("fullName"), ' ', 1),
  "surnames" = CASE
    WHEN position(' ' in trim("fullName")) > 0
      THEN substring(trim("fullName") from position(' ' in trim("fullName")) + 1)
    ELSE ''
  END;

-- Ya rellenas, se exigen a partir de ahora.
ALTER TABLE "public"."PassengerAccount" ALTER COLUMN "givenNames" SET NOT NULL,
ALTER COLUMN "surnames" SET NOT NULL;
