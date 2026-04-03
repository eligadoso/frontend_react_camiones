import { useEffect, useState } from "react";

import { getDashboardMovimientos, getDashboardSummary } from "../api/operationsApi";

export function HomePage() {
  const [summary, setSummary] = useState({
    camiones_en_planta: 0,
    ingresos_hoy: 0,
    tiempo_promedio_estadia_min: 0,
  });
  const [recentMovements, setRecentMovements] = useState([]);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => undefined);
    getDashboardMovimientos().then(setRecentMovements).catch(() => undefined);
  }, []);

  return (
    <>
      <div className="metrics-grid">
        <article className="metric-card">
          <span>Camiones en planta</span>
          <strong>{summary.camiones_en_planta}</strong>
        </article>
        <article className="metric-card">
          <span>Ingresos hoy</span>
          <strong>{summary.ingresos_hoy}</strong>
        </article>
        <article className="metric-card">
          <span>Tiempo promedio estadía</span>
          <strong>{summary.tiempo_promedio_estadia_min} min</strong>
        </article>
      </div>

      <div className="panel">
        <h3>Últimos Movimientos</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Hora</th>
              <th>Patente</th>
              <th>Conductor</th>
              <th>Punto</th>
            </tr>
          </thead>
          <tbody>
            {recentMovements.map((movement) => (
              <tr key={`${movement.patente}-${movement.hora}`}>
                <td>{movement.estado || "Pasó por punto de control"}</td>
                <td>{movement.hora}</td>
                <td>{movement.patente}</td>
                <td>{movement.conductor}</td>
                <td>{movement.punto_control || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
