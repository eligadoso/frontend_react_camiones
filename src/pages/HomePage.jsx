import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Truck, Clock, Activity, MapPin, Navigation, TrendingUp } from "lucide-react";
import { getDashboardSummary, getDashboardMovimientos } from "../api/operationsApi";
import GoogleMapView from "../components/GoogleMapView";

export function HomePage() {
  const [summary, setSummary] = useState({
    camiones_en_planta: 0,
    ingresos_hoy: 0,
    tiempo_promedio_estadia_min: 0,
  });
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    getDashboardSummary()
      .then((result) => {
        if (result && typeof result === "object") {
          setSummary(result.data || result);
        }
      })
      .catch(() => undefined);

    getDashboardMovimientos()
      .then((result) => {
        if (result) {
          setMovements(result.data || result || []);
        }
      })
      .catch(() => undefined);
  }, []);

  const center = { lat: -33.4489, lng: -70.6693 };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Panel de Monitoreo</h1>
            <p className="text-sm text-gray-500 mt-1">Vista en tiempo real del estado de la flota</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="size-4" />
            <span>
              {new Date().toLocaleDateString("es-CL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Camiones en Planta</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {summary.camiones_en_planta}
                </p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                  <TrendingUp className="size-4" />
                  <span>activos ahora</span>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Truck className="size-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Ingresos Hoy</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {summary.ingresos_hoy}
                </p>
                <div className="flex items-center gap-1 mt-2 text-gray-600 text-sm">
                  <Activity className="size-4" />
                  <span>pasos por punto</span>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <MapPin className="size-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-2">Tiempo Promedio Estadía</p>
                <p className="text-3xl font-semibold text-gray-900">
                  {summary.tiempo_promedio_estadia_min}{" "}
                  <span className="text-lg text-gray-500">min</span>
                </p>
                <div className="flex items-center gap-1 mt-2 text-gray-600 text-sm">
                  <Clock className="size-4" />
                  <span>por punto de control</span>
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <Clock className="size-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Map + Recent Movements */}
      <div className="flex-1 px-8 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ubicación en Tiempo Real</h2>
              <p className="text-sm text-gray-500 mt-0.5">Posición actual de los camiones</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm">
                <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                En planta: {summary.camiones_en_planta}
              </span>
            </div>
          </div>
          <div className="flex-1 relative min-h-[400px]">
            <GoogleMapView center={center} zoom={13} markers={[]} />
          </div>
        </motion.div>

        {/* Recent Movements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Últimos Movimientos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Actividad reciente del sistema</p>
          </div>
          <div className="flex-1 overflow-auto">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Activity className="size-8 mb-2" />
                <p className="text-sm">Sin movimientos recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {movements.map((movement, index) => (
                  <motion.div
                    key={`${movement.patente}-${movement.hora}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                        <Navigation className="size-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {movement.estado || "Paso por punto de control"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {movement.punto_control || "-"}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="text-gray-600">{movement.patente}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{movement.conductor}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">{movement.hora}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
