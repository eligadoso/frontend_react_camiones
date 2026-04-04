import { useEffect, useMemo, useState } from "react";

import { getMetricasRuta, getRutas } from "../api/operationsApi";

export function RouteMetricsPage() {
  const [rutas, setRutas] = useState([]);
  const [idRuta, setIdRuta] = useState("");
  const [metricas, setMetricas] = useState(null);
  const [selectedPunto, setSelectedPunto] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRutas().then((result) => setRutas(result.data || [])).catch(() => undefined);
  }, []);

  const loadMetricas = async () => {
    if (!idRuta) {
      setStatus("Selecciona una ruta para evaluar");
      setMetricas(null);
      setSelectedPunto("");
      return;
    }
    try {
      const result = await getMetricasRuta(idRuta);
      const data = result.data || null;
      setMetricas(data);
      const first = (data?.puntos || [])[0];
      setSelectedPunto(first?.id_punto_control || "");
      setStatus("Métricas cargadas");
    } catch {
      setMetricas(null);
      setSelectedPunto("");
      setStatus("No fue posible cargar métricas");
    }
  };

  useEffect(() => {
    loadMetricas();
  }, [idRuta]);

  const selectedData = useMemo(
    () => (metricas?.puntos || []).find((p) => p.id_punto_control === selectedPunto) || null,
    [metricas, selectedPunto]
  );

  const maxDuracion = useMemo(() => {
    const values = (selectedData?.registros || []).map((r) => r.duracion_min || 0);
    return values.length ? Math.max(...values) : 1;
  }, [selectedData]);

  return (
    <>
      <div className="panel">
        <h3>Métricas de rutas</h3>
        <p>Analiza tiempos de recorrido entre puntos en una línea de tiempo operativa.</p>
        <div className="row">
          <select value={idRuta} onChange={(event) => setIdRuta(event.target.value)}>
            <option value="">Selecciona ruta a evaluar</option>
            {rutas.map((ruta) => (
              <option key={ruta.id_ruta} value={ruta.id_ruta}>
                {ruta.nombre}
              </option>
            ))}
          </select>
          <button onClick={loadMetricas}>Cargar métricas</button>
          <span>{status || "-"}</span>
        </div>
      </div>

      <div className="route-metrics-grid">
        <div className="panel">
          <h3>Ruta evaluada</h3>
          <div className="timeline-column">
            {(metricas?.puntos || []).map((punto) => (
              <button
                key={punto.id_punto_control}
                className={`timeline-node ${selectedPunto === punto.id_punto_control ? "active" : ""}`}
                onClick={() => setSelectedPunto(punto.id_punto_control)}
              >
                <span className="timeline-order">{punto.orden}</span>
                <div>
                  <strong>{punto.nombre_punto || punto.id_punto_control}</strong>
                  <small>Tramo desde punto #{punto.transicion_desde_orden}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Análisis del punto</h3>
          <h4>{selectedData?.nombre_punto || "Selecciona un punto"}</h4>
          <div className="bars">
            {(selectedData?.registros || []).map((item) => (
              <div key={`${item.id_camion}-${item.fecha_hora}`} className="bar-row">
                <div className="bar-label">
                  {item.patente || item.id_camion} · {new Date(item.fecha_hora).toLocaleDateString()}
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(8, (item.duracion_min / maxDuracion) * 100)}%` }}
                  />
                </div>
                <div className="bar-value">{item.duracion_min} min</div>
              </div>
            ))}
          </div>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Camión</th>
                <th>Fecha</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {(selectedData?.registros || []).map((item) => (
                <tr key={`row-${item.id_camion}-${item.fecha_hora}`}>
                  <td>{item.patente || item.id_camion}</td>
                  <td>{new Date(item.fecha_hora).toLocaleString()}</td>
                  <td>{item.duracion_min} min</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="metrics-grid" style={{ marginTop: 16 }}>
            <article className="metric-card">
              <span>Tiempo más alto</span>
              <strong>
                {selectedData?.resumen?.tiempo_mas_alto
                  ? `${selectedData.resumen.tiempo_mas_alto.duracion_min} min`
                  : "--"}
              </strong>
              <small>
                {selectedData?.resumen?.tiempo_mas_alto
                  ? `${selectedData.resumen.tiempo_mas_alto.patente || "-"} / ${new Date(selectedData.resumen.tiempo_mas_alto.fecha_hora).toLocaleDateString()}`
                  : "--"}
              </small>
            </article>
            <article className="metric-card">
              <span>Tiempo más bajo</span>
              <strong>
                {selectedData?.resumen?.tiempo_mas_bajo
                  ? `${selectedData.resumen.tiempo_mas_bajo.duracion_min} min`
                  : "--"}
              </strong>
              <small>
                {selectedData?.resumen?.tiempo_mas_bajo
                  ? `${selectedData.resumen.tiempo_mas_bajo.patente || "-"} / ${new Date(selectedData.resumen.tiempo_mas_bajo.fecha_hora).toLocaleDateString()}`
                  : "--"}
              </small>
            </article>
            <article className="metric-card">
              <span>Tiempo promedio</span>
              <strong>
                {selectedData?.resumen?.tiempo_promedio_min != null
                  ? `${selectedData.resumen.tiempo_promedio_min} min`
                  : "--"}
              </strong>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
