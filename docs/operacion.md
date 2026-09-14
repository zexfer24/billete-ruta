# Operación diaria de TicketRuta

Guía para el personal del terminal y de las agencias. Todas las horas del sistema están en hora de Venezuela y en formato de 24 horas.

## Estados de una reserva

| Estado | Qué significa | Ocupa cupo |
|---|---|---|
| `PENDIENTE_PAGO` | Creada, todavía sin comprobante. Se libera sola a las 2 horas | Sí |
| `EN_VALIDACION` | El pasajero subió un comprobante y espera revisión | Sí |
| `ABONADA` | Hay pagos aprobados pero queda saldo | Sí |
| `PAGADA` | Saldo en cero. El ticket ya se emitió | Sí |
| `PAGO_EN_SITIO` | Reserva condicional: paga en taquilla o al abordar | Sí |
| `LIBERADA` | Venció sin pago, o no reconfirmó el pago en sitio | No |
| `CANCELADA` | Anulada desde el panel o al partir sin pagar | No |
| `ABORDADA` | Subió a la unidad | Sí |
| `NO_SHOW` | Estaba pagada y no se presentó | No |

Una reserva pagada **nunca** se libera automáticamente. Desde la ronda 4 (2026-09-13), `PENDIENTE_PAGO` también pasa directo a `ABONADA` o `PAGADA` con un cobro en efectivo registrado desde el panel, sin pasar por `EN_VALIDACION`.

## Rutina del operador de agencia

**1. Tablero.** Es la primera pantalla al entrar. Muestra las cifras del día (o de 7 o 30 días, con el selector de periodo): tickets pendientes, salidas y recaudación, además de la flota en operación, los embarques y desembarques de hoy y la actividad reciente de la agencia. Desde ahí mismo, la fila de registro rápido abre en un panel lateral el cobro, el alta de salida, de vehículo o de chofer sin salir del tablero.

**2. Pasajeros y pagos.** Empieza por la pestaña "Por revisar": por cada comprobante compara el monto declarado con el saldo de la reserva y mira la imagen. Aprobar suma el abono; si el saldo llega a cero, el sistema emite el ticket solo. Rechazar exige un motivo, que le llega al pasajero para que cargue otro comprobante. Para cobrar en efectivo, abre el detalle de la reserva desde cualquier pestaña y usa su acción de cobro, o usa "Registrar cobro" con el serial cuando no tienes la reserva a la vista. Si el pasajero paga en una moneda distinta a la de su reserva, el sistema convierte con la tasa de cambio vigente en ese momento, no con la tasa congelada de la reserva.

**3. Taquilla.** Para vender un pasaje en el mostrador: (1) elige la salida con cupo, (2) busca al titular por cédula — si no tiene cuenta, la creas ahí mismo sin contraseña, con foto de cédula si falta —, (3) agrega hasta 5 acompañantes, con el permiso de viaje si alguno es menor, y (4) cobra en efectivo el total en la moneda del método elegido. El ticket se emite en el acto con su QR. Si la cuenta se creó en la taquilla, el pasajero la activa después por su cuenta en `/registro`, con la misma cédula, teléfono y año de nacimiento.

**4. Salidas y hoja de salida.** Antes de cada salida, ábrela y pulsa Iniciar embarque: eso cierra el manifiesto y desde ese momento nadie más puede reservar en esa unidad. En el andén, en Abordaje, pide el serial del titular o escanea el QR de su ticket; el sistema muestra el grupo completo, marca a quienes suben y pulsa Abordar grupo (un QR alterado se rechaza en el acto). Al partir, pulsa Registrar salida: las reservas pagadas que no abordaron quedan como ausentes y las de pago en sitio que nunca pagaron se cancelan con su motivo. Al llegar a destino, pulsa Registrar llegada; con eso queda calculada la duración del recorrido.

**5. Flota.** Vehículos y choferes en pestañas, con su estado operativo (en ruta, embarcando, asignado, disponible o fuera de servicio) y su próxima salida.

**6. Reportes, al cierre.** Revisa Recaudación para ver cuánto entró por cada ruta, con el mismo selector de periodo del tablero, y Movimientos para el desempeño de los choferes.

## Rutina del admin del terminal

**Tablero.** La tasa de salida recaudada se actualiza sola cada 30 segundos. Junto a ella verás los recorridos completados, los usuarios nuevos y los recurrentes.

**Tasas.** Carga la tasa de salida cuando cambie y mantén al día las tasas de cambio de bolívares y pesos colombianos. Un cambio de tasa no altera reservas ya creadas: cada reserva guarda la tasa con la que se cotizó.

**Agencias.** Da de alta una agencia junto con su primer usuario operador. Ese operador crea después sus propios vehículos, choferes, rutas y salidas.

**Movimientos.** Vista de todas las agencias con horas de embarque y desembarque, duración, chofer y cantidad de pasajeros.

**Usuarios.** La base de datos de pasajeros es información sensible. Cada consulta queda registrada en la bitácora con el usuario que la hizo y el filtro que aplicó. Úsala solo cuando haga falta.

**Mensajes.** En esta versión los mensajes no salen a WhatsApp. Esta bandeja muestra qué se habría enviado, a quién y con qué texto, además de los intentos y el último error. Si ves mensajes fallidos, la reserva correspondiente queda marcada para contacto manual.

## Alta de una agencia nueva

1. El admin la crea en Agencias con su RIF, contacto y el correo y contraseña de su primer operador.
2. El operador entra y carga sus vehículos con placa, marca, modelo y número de asientos.
3. Carga sus choferes con nombre, cédula y teléfono.
4. Sus rutas las crea el admin o se cargan por migración, con origen, destino, tarifa en dólares, punto de encuentro y duración estimada.
5. El operador programa salidas asignando ruta, vehículo, chofer y hora. El cupo se toma del número de asientos del vehículo.

## Qué hacer cuando algo falla

**Un pasajero dice que pagó y su reserva sigue pendiente.** Búscala por serial en Pasajeros y pagos. Si no hay comprobante cargado, el pasajero debe subirlo desde su cuenta. Si lo hay y sigue en validación, está en la pestaña "Por revisar".

**Se liberó un cupo por error.** Una reserva liberada no se puede revivir: el pasajero debe reservar de nuevo. Si había lista de espera, el cupo ya fue ofrecido al siguiente.

**El ticket no se generó.** La reserva queda pagada igual. Vuelve a aprobar o registra de nuevo el cobro para forzar la emisión; el sistema conserva el mismo código QR.

**Mensajes fallidos.** El sistema reintenta cinco veces con espera creciente. Agotados los intentos, la reserva se marca para contacto manual y aparece en el resumen del panel.

## Copias de seguridad

La base de datos vive en el volumen Docker `ticketruta_pgdata` y los archivos subidos en la carpeta `uploads/`. Ambos deben respaldarse juntos: un volcado de la base sin los comprobantes deja reservas sin su respaldo documental.

```bash
docker exec ticketruta_db_dev pg_dump -U ticketruta ticketruta > respaldo-$(date +%F).sql
tar -czf uploads-$(date +%F).tar.gz uploads/
```
