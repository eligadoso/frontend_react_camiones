import { env } from "../config/env";
import { requestJson } from "./httpClient";

export function getCamiones() {
  return requestJson(`${env.pythonApiUrl}/camiones`);
}

export function createCamion(payload) {
  return requestJson(`${env.pythonApiUrl}/camiones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getConductores() {
  return requestJson(`${env.pythonApiUrl}/conductores`);
}

export function createConductor(payload) {
  return requestJson(`${env.pythonApiUrl}/conductores`, {
    method: "POST",
    body: JSON.stringify(payload),
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

export function createVinculacion(payload) {
  return requestJson(`${env.pythonApiUrl}/vinculaciones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPuntosControl() {
  return requestJson(`${env.pythonApiUrl}/puntos-control`);
}

export function updatePuntoControl(idPuntoControl, payload) {
  return requestJson(`${env.pythonApiUrl}/puntos-control/${idPuntoControl}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
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
