import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getMetricasRuta, getRutas } from "../api/operationsApi";

export function RouteMetricsPage() {
  const [rutas, setRutas] = useState([]);
  const [selectedRuta, setSelectedRuta] = useState("");
  const [metricas, setMetricas] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRutas()
      .then((r) => {
        const data = r.data || r || [];
        setRutas(data);
        if (data.length > 0) setSelectedRuta(String(data[0].id_ruta));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedRuta) {
      setMetricas(null);
      setSelectedSegmentId(null);
      return;
    }
    setStatus("Cargando métricas...");
    getMetricasRuta(selectedRuta)
      .then((r) => {
        const data = r.data || r || null;
        setMetricas(data);
        const first = (data?.puntos || [])[0];
        setSelectedSegmentId(first?.id_segmento || first?.id_punto_control || null);
        setStatus("");
      })
      .catch(() => {
        setMetricas(null);
        setSelectedSegmentId(null);
        setStatus("No fue posible cargar métricas");
      });
  }, [selectedRuta]);

  // Transformar puntos de la API al formato de segmentos del rediseño
  // Cada punto tiene: id_punto_control, nombre_punto, orden, transicion_desde_orden, registros, resumen
  const segments = useMemo(() => {
    if (!metricas?.puntos) return [];
    return metricas.puntos.map((punto) => ({
      id: punto.id_segmento || `${punto.desde?.id_punto_control}-${punto.hasta?.id_punto_control}`,
      from: punto.desde?.nombre_punto || punto.nombre_punto_anterior || `Punto #${punto.transicion_desde_orden}`,
      to: punto.hasta?.nombre_punto || punto.nombre_punto || punto.id_punto_control,
      fromOrder: punto.desde?.orden ?? punto.transicion_desde_orden,
      orden: punto.orden,
      times: (punto.registros || []).map((r) => ({
        truck: r.patente || r.id_camion,
        date: new Date(r.fecha_hora).toLocaleDateString("es-CL"),
        time: r.duracion_min || 0,
        timeStr: `${r.duracion_min} min`,
      })),
      avgTime: punto.resumen?.tiempo_promedio_min ?? 0,
      maxTime: punto.resumen?.tiempo_mas_alto?.duracion_min ?? 0,
      minTime: punto.resumen?.tiempo_mas_bajo?.duracion_min ?? 0,
    }));
  }, [metricas]);

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedSegmentId) || null,
    [segments, selectedSegmentId]
  );

  const chartData = useMemo(() => {
    if (!selectedSegment) return [];
    return selectedSegment.times.map((record) => ({
      name: record.date,
      tiempo: record.time,
      promedio: selectedSegment.avgTime,
    }));
  }, [selectedSegment]);

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Métricas de Rutas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analiza tiempos de recorrido entre puntos en una línea de tiempo operativa
        </p>
      </header>

      {/* Route Selector */}
      <div className="px-8 py-6 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Seleccionar Ruta:</label>
          <select
            value={selectedRuta}
            onChange={(e) => {
              setSelectedRuta(e.target.value);
              setSelectedSegmentId(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona ruta a evaluar</option>
            {rutas.map((r) => (
              <option key={r.id_ruta} value={r.id_ruta}>
                {r.nombre}
              </option>
            ))}
          </select>
          {status && <span className="text-sm text-gray-500">{status}</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-auto">
        {/* Segments List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Trazos de Ruta</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecciona para ver análisis detallado</p>
          </div>
          <div className="divide-y divide-gray-100">
            {segments.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                {selectedRuta ? "Sin datos para esta ruta" : "Selecciona una ruta"}
              </div>
            ) : (
              segments.map((segment) => (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegmentId(segment.id)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedSegmentId === segment.id
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedSegmentId === segment.id ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      <ArrowRight
                        className={`size-4 ${
                          selectedSegmentId === segment.id
                            ? "text-blue-600"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Trazo de:</div>
                      <div className="text-sm font-medium text-gray-900">
                        {segment.from} → {segment.to}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {segment.times.length} registro
                        {segment.times.length !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Promedio:</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {Number(segment.avgTime).toFixed(2)} min
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* Segment Analysis */}
        {selectedSegment ? (
          <motion.div
            key={selectedSegmentId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Clock className="size-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-1">Tiempo Promedio</div>
                <div className="text-3xl font-semibold text-gray-900">
                  {Number(selectedSegment.avgTime).toFixed(2)}{" "}
                  <span className="text-lg text-gray-500">min</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <TrendingDown className="size-5 text-green-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-1">Tiempo Más Bajo</div>
                <div className="text-3xl font-semibold text-green-600">
                  {Number(selectedSegment.minTime).toFixed(2)}{" "}
                  <span className="text-lg text-green-500">min</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <TrendingUp className="size-5 text-red-600" />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-1">Tiempo Más Alto</div>
                <div className="text-3xl font-semibold text-red-600">
                  {Number(selectedSegment.maxTime).toFixed(2)}{" "}
                  <span className="text-lg text-red-500">min</span>
                </div>
              </motion.div>
            </div>

            {/* Line Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Evolución de Tiempos</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tramo: {selectedSegment.from} → {selectedSegment.to}
                </p>
              </div>
              <div className="p-6">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    Sin registros para este tramo
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        stroke="#9ca3af"
                        label={{
                          value: "Tiempo (min)",
                          angle: -90,
                          position: "insideLeft",
                          style: { fill: "#6b7280", fontSize: 12 },
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
                      <Line
                        type="monotone"
                        dataKey="tiempo"
                        name="Tiempo Real"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="promedio"
                        name="Promedio"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm"
          >
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-fit mx-auto mb-4">
                <BarChart3 className="size-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Selecciona un trazo</h3>
              <p className="text-sm text-gray-500">
                Elige un trazo para ver el análisis de métricas
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
