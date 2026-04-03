import { useEffect, useState } from "react";

import { getMovimientosAcceso } from "../api/operationsApi";

export function WebhookPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [lastRefresh, setLastRefresh] = useState("");

  const loadHistorial = () => {
    getMovimientosAcceso()
      .then((result) => {
        setMovimientos(result.data || []);
        setLastRefresh(new Date().toLocaleTimeString());
      })
      .catch(() => setMovimientos([]));
  };

  useEffect(() => {
    loadHistorial();
    const intervalId = setInterval(loadHistorial, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="panel">
      <h2>Historial de Movimientos</h2>
      <div className="row">
        <button onClick={loadHistorial}>Recargar historial</button>
        <span>Actualización automática cada 5s · Última: {lastRefresh || "-"}</span>
      </div>
      <table className="data-table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Evento</th>
            <th>Fecha/Hora</th>
            <th>Móvil</th>
            <th>Chofer</th>
            <th>Punto de Control</th>
            <th>ID Lectura</th>
            <th>ID Visita</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((item) => (
            <tr key={item.id_movimiento}>
              <td>{item.evento || "Pasó por punto de control"}</td>
              <td>{item.fecha_hora_movimiento ? new Date(item.fecha_hora_movimiento).toLocaleString() : "-"}</td>
              <td>{item.movil || "-"}</td>
              <td>{item.chofer || "-"}</td>
              <td>{item.punto_control_nombre || item.id_punto_control}</td>
              <td>{item.id_lectura}</td>
              <td>{item.id_visita}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
