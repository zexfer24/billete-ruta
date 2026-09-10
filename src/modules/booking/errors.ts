export class NoSeatsAvailableError extends Error {
  constructor(readonly available: number) {
    super(
      available > 0
        ? `Ya no hay puestos suficientes. Quedan ${available} disponibles.`
        : "Esta salida no tiene puestos disponibles.",
    );
    this.name = "NoSeatsAvailableError";
  }
}

export class DepartureClosedError extends Error {
  constructor(message = "Esta salida ya no admite reservas.") {
    super(message);
    this.name = "DepartureClosedError";
  }
}

export class MissingDocumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingDocumentsError";
  }
}

export class NotOwnerError extends Error {
  constructor(message = "Esta reserva no pertenece a tu cuenta.") {
    super(message);
    this.name = "NotOwnerError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
