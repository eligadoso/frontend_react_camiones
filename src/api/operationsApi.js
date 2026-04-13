import { env } from "../config/env";
import { requestJson } from "./httpClient";

export function getCamiones() {
  return requestJson(`${env.pythonApiUrl}/camiones`);
}

export function getCamion(idCamion) {
  return requestJson(`${env.pythonApiUrl}/camiones/${idCamion}`);
}

export function createCamion(payload) {
  return requestJson(`${env.pythonApiUrl}/camiones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCamion(idCamion, payload) {
  return requestJson(`${env.pythonApiUrl}/camiones/${idCamion}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCamion(idCamion) {
  return requestJson(`${env.pythonApiUrl}/camiones/${idCamion}`, {
    method: "DELETE",
  });
}

export function asignarConductorACamion(idCamion, idConductor) {
  return requestJson(`${env.pythonApiUrl}/camiones/${idCamion}/asignar-conductor`, {
    method: "PUT",
    body: JSON.stringify({ id_conductor: idConductor }),
  });
}

export function desasignarConductorDeCamion(idCamion) {
  return requestJson(`${env.pythonApiUrl}/camiones/${idCamion}/asignar-conductor`, {
    method: "DELETE",
  });
}

export function getConductores() {
  return requestJson(`${env.pythonApiUrl}/conductores`);
}

export function getConductor(idConductor) {
  return requestJson(`${env.pythonApiUrl}/conductores/${idConductor}`);
}

export function createConductor(payload) {
  return requestJson(`${env.pythonApiUrl}/conductores`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateConductor(idConductor, payload) {
  return requestJson(`${env.pythonApiUrl}/conductores/${idConductor}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteConductor(idConductor) {
  return requestJson(`${env.pythonApiUrl}/conductores/${idConductor}`, {
    method: "DELETE",
  });
}

export function asignarCamionAConductor(idConductor, idCamion) {
  return requestJson(`${env.pythonApiUrl}/conductores/${idConductor}/asignar-camion`, {
    method: "PUT",
    body: JSON.stringify({ id_camion: idCamion }),
  });
}

export function desasignarCamionDeConductor(idConductor) {
  return requestJson(`${env.pythonApiUrl}/conductores/${idConductor}/asignar-camion`, {
    method: "DELETE",
  });
}

export function getTags() {
  return requestJson(`${env.pythonApiUrl}/rfid/tags`);
}

export function updateTag(idTag, payload) {
  return requestJson(`${env.pythonApiUrl}/rfid/tags/${idTag}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTag(idTag) {
  return requestJson(`${env.pythonApiUrl}/rfid/tags/${idTag}`, {
    method: "DELETE",
  });
}

export function asignarConductorATag(idTag, idConductor) {
  return requestJson(`${env.pythonApiUrl}/rfid/tags/${idTag}/asignar-conductor`, {
    method: "PUT",
    body: JSON.stringify({ id_conductor: idConductor }),
  });
}

export function desasignarConductorDeTag(idTag) {
  return requestJson(`${env.pythonApiUrl}/rfid/tags/${idTag}/asignar-conductor`, {
    method: "DELETE",
  });
}

export function getTiposPuntoControl() {
  return requestJson(`${env.pythonApiUrl}/tipos-punto-control`);
}

export function createTipoPuntoControl(payload) {
  return requestJson(`${env.pythonApiUrl}/tipos-punto-control`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTipoPuntoControl(idTipo, payload) {
  return requestJson(`${env.pythonApiUrl}/tipos-punto-control/${idTipo}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTipoPuntoControl(idTipo) {
  return requestJson(`${env.pythonApiUrl}/tipos-punto-control/${idTipo}`, {
    method: "DELETE",
  });
}

export function createVinculacion(payload) {
  return requestJson(`${env.pythonApiUrl}/vinculaciones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPuntosControl() {
  return requestJson(`${env.pythonApiUrl}/puntos-control`);
}

export function createPuntoControl(payload) {
  return requestJson(`${env.pythonApiUrl}/puntos-control`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePuntoControl(idPuntoControl, payload) {
  return requestJson(`${env.pythonApiUrl}/puntos-control/${idPuntoControl}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePuntoControl(idPuntoControl) {
  return requestJson(`${env.pythonApiUrl}/puntos-control/${idPuntoControl}`, {
    method: "DELETE",
  });
}

export function getRutas() {
  return requestJson(`${env.pythonApiUrl}/rutas`);
}

export function createRuta(payload) {
  return requestJson(`${env.pythonApiUrl}/rutas`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRuta(idRuta, payload) {
  return requestJson(`${env.pythonApiUrl}/rutas/${idRuta}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRuta(idRuta) {
  return requestJson(`${env.pythonApiUrl}/rutas/${idRuta}`, {
    method: "DELETE",
  });
}

export function createRutaAsignacion(payload) {
  return requestJson(`${env.pythonApiUrl}/seguimiento-rutas/asignaciones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRutaAsignaciones(idRuta) {
  const suffix = idRuta ? `?id_ruta=${encodeURIComponent(idRuta)}` : "";
  return requestJson(`${env.pythonApiUrl}/seguimiento-rutas/asignaciones${suffix}`);
}

export function iniciarRecorrido(idAsignacionRuta) {
  return requestJson(
    `${env.pythonApiUrl}/seguimiento-rutas/asignaciones/${idAsignacionRuta}/iniciar`,
    { method: "POST" },
  );
}

export function finalizarRecorrido(idAsignacionRuta) {
  return requestJson(
    `${env.pythonApiUrl}/seguimiento-rutas/asignaciones/${idAsignacionRuta}/finalizar`,
    { method: "POST" },
  );
}

export function cancelarRecorrido(idAsignacionRuta) {
  return requestJson(
    `${env.pythonApiUrl}/seguimiento-rutas/asignaciones/${idAsignacionRuta}/cancelar`,
    { method: "POST" },
  );
}

/** Añade un punto de control al snapshot de un recorrido activo.
 * @param {string} idAsignacionRuta
 * @param {{ id_punto_control: string, orden?: number }} payload
 */
export function agregarPuntoRecorrido(idAsignacionRuta, payload) {
  return requestJson(
    `${env.pythonApiUrl}/seguimiento-rutas/asignaciones/${idAsignacionRuta}/puntos`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/** Sincroniza puntos futuros no interactuados con la ruta maestra actual.
 * El backend detecta si la operación es segura o ambigua.
 */
export function recargarRutaRecorrido(idAsignacionRuta) {
  return requestJson(
    `${env.pythonApiUrl}/seguimiento-rutas/asignaciones/${idAsignacionRuta}/recargar-ruta`,
    { method: "POST" },
  );
}

export function getSeguimientoRuta(idRuta, idCamion, idAsignacionRuta) {
  const params = new URLSearchParams({ id_ruta: idRuta, id_camion: idCamion });
  if (idAsignacionRuta) {
    params.set("id_asignacion_ruta", idAsignacionRuta);
  }
  return requestJson(`${env.pythonApiUrl}/seguimiento-rutas?${params.toString()}`);
}

export function getMetricasRuta(idRuta) {
  const params = new URLSearchParams({ id_ruta: idRuta });
  return requestJson(`${env.pythonApiUrl}/metricas-rutas?${params.toString()}`);
}

export function getMovimientosAcceso() {
  return requestJson(`${env.pythonApiUrl}/movimientos-acceso`);
}

export function getDashboardSummary() {
  return requestJson(`${env.pythonApiUrl}/dashboard/summary`);
}

export function getDashboardMovimientos() {
  return requestJson(`${env.pythonApiUrl}/dashboard/movimientos`);
}

export function getDashboardUbicacionTiempoReal() {
  return requestJson(`${env.pythonApiUrl}/dashboard/ubicacion-tiempo-real`);
}
