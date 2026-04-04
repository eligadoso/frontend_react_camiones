import { useEffect, useState } from "react";

import {
  createRutaAsignacion,
  getCamiones,
  getRutaAsignaciones,
  getRutas,
  getSeguimientoRuta,
} from "../api/operationsApi";

export function RouteTrackingPage() {
  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [idRuta, setIdRuta] = useState("");
  const [idCamion, setIdCamion] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [seguimiento, setSeguimiento] = useState(null);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRutas().then((result) => setRutas(result.data || [])).catch(() => undefined);
    getCamiones().then((result) => setCamiones(result.data || [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!idRuta) {
      setAsignaciones([]);
      return;
    }
    getRutaAsignaciones(idRuta)
      .then((result) => setAsignaciones(result.data || []))
      .catch(() => setAsignaciones([]));
  }, [idRuta]);

  useEffect(() => {
    const timer = setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!idRuta || !idCamion) {
      return undefined;
    }
    const poll = setInterval(() => {
      getSeguimientoRuta(idRuta, idCamion)
        .then((result) => setSeguimiento(result.data || null))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(poll);
  }, [idRuta, idCamion]);

  const onAsignarRuta = async () => {
    if (!idRuta || !idCamion || !horaInicio) {
      return;
    }
    await createRutaAsignacion({
      id_ruta: idRuta,
      id_camion: idCamion,
      hora_inicio: new Date(horaInicio).toISOString(),
    });
    setStatus("Ruta asignada al camión");
    const result = await getRutaAsignaciones(idRuta);
    setAsignaciones(result.data || []);
  };

  const onVerSeguimiento = async () => {
    if (!idRuta || !idCamion) {
      return;
    }
    const result = await getSeguimientoRuta(idRuta, idCamion);
    setSeguimiento(result.data || null);
  };

  const formatTiempoEnPunto = (punto) => {
    if (punto.estado !== "en_punto") {
      return punto.tiempo_en_punto || "--:--";
    }
    const ref = punto.referencia_tiempo_en_punto;
    if (!ref) {
      return punto.tiempo_en_punto || "--:--";
    }
    const refDate = new Date(ref);
    const diffMs = Date.now() + tick * 0 - refDate.getTime();
    if (diffMs < 0) {
      return "00:00";
    }
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="panel">
        <h3>Asignar ruta a camión con hora inicio</h3>
        {status ? <p>{status}</p> : null}
        <div className="row">
          <select value={idRuta} onChange={(event) => setIdRuta(event.target.value)}>
            <option value="">Selecciona ruta</option>
            {rutas.map((ruta) => (
              <option key={ruta.id_ruta} value={ruta.id_ruta}>
                {ruta.nombre}
              </option>
            ))}
          </select>
          <select value={idCamion} onChange={(event) => setIdCamion(event.target.value)}>
            <option value="">Selecciona camión</option>
            {camiones.map((camion) => (
              <option key={camion.id_camion} value={camion.id_camion}>
                {camion.patente}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={horaInicio}
            onChange={(event) => setHoraInicio(event.target.value)}
          />
          <button onClick={onAsignarRuta}>Asignar ruta</button>
          <button className="secondary" onClick={onVerSeguimiento}>
            Ver seguimiento
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Camiones vinculados a la ruta</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Camión</th>
              <th>Hora inicio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((item) => (
              <tr key={item.id_asignacion_ruta}>
                <td>{item.patente || item.id_camion}</td>
                <td>{item.hora_inicio ? new Date(item.hora_inicio).toLocaleString() : "-"}</td>
                <td>{item.activa ? "activa" : "cerrada"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Seguimiento de ruta</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Punto</th>
              <th>Estado</th>
              <th>Fecha/Hora</th>
              <th>Tiempo en punto</th>
            </tr>
          </thead>
          <tbody>
            {(seguimiento?.puntos || []).map((punto) => (
              <tr key={`${punto.id_punto_control}-${punto.orden}`}>
                <td>{punto.orden}</td>
                <td>{punto.nombre_punto || punto.id_punto_control}</td>
                <td>{punto.estado}</td>
                <td>{punto.fecha_hora_paso || "--:--; --/--"}</td>
                <td>{formatTiempoEnPunto(punto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
