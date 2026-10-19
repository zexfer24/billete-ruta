import type { ReactNode } from "react";
import { formatCaracasDateTime24 } from "@/lib/time";
import type { PassengerProfile } from "@/modules/reports";
import { formatPhone } from "../../_shared/format";
import { birthYearText, registrationOriginText } from "./profile-format";
import { ProfileCard, ProfileSection } from "./profile-section";

function Datum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-tinta-suave">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] text-tinta">{children}</dd>
    </div>
  );
}

/** "Datos personales": lista de definición en dos columnas desde `md`. */
export function ProfilePersonal({ account }: { account: PassengerProfile["account"] }) {
  return (
    <ProfileSection id="datos-personales" title="Datos personales">
      <ProfileCard>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <Datum label="Nombres">{account.givenNames}</Datum>
          <Datum label="Apellidos">{account.surnames}</Datum>
          <Datum label="Cédula">
            <span className="tabular">{account.idNumber}</span>
          </Datum>
          <Datum label="Teléfono">
            <span className="tabular">{formatPhone(account.phone)}</span>
          </Datum>
          <Datum label="Año de nacimiento">
            <span className="tabular">{birthYearText(account.birthYear, account.age)}</span>
          </Datum>
          <Datum label="Registrado">
            <span className="tabular">{formatCaracasDateTime24(account.createdAt)}</span>
          </Datum>
          <Datum label="Último ingreso">
            {account.lastLoginAt ? (
              <span className="tabular">{formatCaracasDateTime24(account.lastLoginAt)}</span>
            ) : (
              <span className="text-tinta-suave">Nunca ingresó</span>
            )}
          </Datum>
          <Datum label="Alta">{registrationOriginText(account.createdVia, account.createdByName)}</Datum>
        </dl>
      </ProfileCard>
    </ProfileSection>
  );
}
