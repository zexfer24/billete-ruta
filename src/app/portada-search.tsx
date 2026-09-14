"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { SearchCard } from "@/components/search-card";

export interface PortadaSearchProps {
  origins: string[];
  destinations: string[];
  loggedIn: boolean;
}

/**
 * Buscador de la portada: guarda origen y destino en estado local y arma el
 * enlace de "Buscar salidas" hacia el asistente de reserva (o hacia ingresar,
 * con `next`, si todavía no hay sesión).
 */
export function PortadaSearch({ origins, destinations, loggedIn }: PortadaSearchProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const params = new URLSearchParams();
  if (origin) params.set("origen", origin);
  if (destination) params.set("destino", destination);
  const query = params.toString();
  const rutaReserva = query ? `/mi/reservar?${query}` : "/mi/reservar";
  const href = loggedIn ? rutaReserva : `/ingresar?next=${encodeURIComponent(rutaReserva)}`;

  return (
    <SearchCard
      origins={origins}
      destinations={destinations}
      origin={origin}
      destination={destination}
      onChange={({ origin: nuevoOrigen, destination: nuevoDestino }) => {
        setOrigin(nuevoOrigen);
        setDestination(nuevoDestino);
      }}
      variant="azul"
    >
      <Link href={href} className={buttonClass("primario", "w-full")}>
        Buscar salidas
      </Link>
    </SearchCard>
  );
}
