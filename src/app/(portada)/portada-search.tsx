"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { IconInfo, IconSearch } from "@/components/icons";
import { SearchCard } from "@/components/search-card";
import { passengerHref } from "../_publico/links";

export interface PortadaSearchProps {
  origins: string[];
  destinations: string[];
  loggedIn: boolean;
  /** Título visible del buscador. */
  title: string;
}

/**
 * Buscador de la portada: guarda origen y destino en estado local y arma el
 * enlace de "Buscar salidas" hacia el asistente de reserva (o hacia ingresar,
 * con `next`, si todavía no hay sesión). Sin sesión avisa antes, en una línea,
 * que se pedirá la cédula: nadie se encuentra un formulario sin esperarlo.
 */
export function PortadaSearch({ origins, destinations, loggedIn, title }: PortadaSearchProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const params = new URLSearchParams();
  if (origin) params.set("origen", origin);
  if (destination) params.set("destino", destination);
  const query = params.toString();
  const rutaReserva = query ? `/mi/reservar?${query}` : "/mi/reservar";

  return (
    <SearchCard
      title={title}
      origins={origins}
      destinations={destinations}
      origin={origin}
      destination={destination}
      onChange={({ origin: nuevoOrigen, destination: nuevoDestino }) => {
        setOrigin(nuevoOrigen);
        setDestination(nuevoDestino);
      }}
    >
      <Link href={passengerHref(rutaReserva, loggedIn)} className={buttonClass("acento", "w-full", "lg")}>
        <IconSearch aria-hidden="true" className="size-5" />
        Buscar salidas
      </Link>
      {loggedIn ? null : (
        <p className="flex w-full items-start gap-2 text-sm leading-snug text-white/85">
          <IconInfo aria-hidden="true" className="size-5 shrink-0" />
          Para reservar te pediremos que ingreses con tu cédula.
        </p>
      )}
    </SearchCard>
  );
}
