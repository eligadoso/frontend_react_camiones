import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, Truck, Calendar, Plus, X, CheckCircle2, Loader2 } from "lucide-react";
import {
  createRutaAsignacion,
  getCamiones,
  getPuntosControl,
  getRutaAsignaciones,
  getRutas,
  getSeguimientoRuta,
} from "../api/operationsApi";
import GoogleMapView from "../components/GoogleMapView";

function parseCoords(cordenadas) {
  if (!cordenadas) return null;
  try {
    if (typeof cordenadas === "object") {
      if (Array.isArray(cordenadas) && cordenadas.length === 2) {
        return { lat: Number(cordenadas[0]), lng: Number(cordenadas[1]) };
      }
      if ("lat" in cordenadas && "lng" in cordenadas) return cordenadas;
      if ("latitude" in cordenadas && "longitude" in cordenadas) {
        return { lat: Number(cordenadas.latitude), lng: Number(cordenadas.longitude) };
      }
    }
    const str = String(cordenadas).trim();
    const parts = str.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  } catch {
    // ignore
  }
  return null;
}

const getStatusConfig = (estado) => {
  if (estado === "pasado" || estado === "completed")
    return { segLabel: "completed", cls: "bg-green-100 text-green-700" };
  if (estado === "en_punto" || estado === "in_progress")
    return { segLabel: "in_progress", cls: "bg-amber-100 text-amber-700" };
  return { segLabel: "pending", cls: "bg-gray-100 text-gray-500" };
};

const isCompletedStatus = (estado) => estado === "pasado" || estado === "completed";
const isInProgressStatus = (estado) => estado === "en_punto" || estado === "in_progress";

const getSegmentStatus = (currentPoint, nextPoint) => {
  if (!currentPoint || !nextPoint) return "pending";
  if (isCompletedStatus(nextPoint.status)) return "completed";
  if (isInProgressStatus(nextPoint.status)) return "in_progress";
  if (isCompletedStatus(currentPoint.status) && nextPoint.status === "pendiente") return "in_progress";
  return "pending";
};

export function RouteTrackingPage() {
  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [puntosControl, setPuntosControl] = useState([]);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [seguimiento, setSeguimiento] = useState(null);
  // Camión seleccionado para ver su seguimiento (id_camion real)
  const [selectedCamionId, setSelectedCamionId] = useState("");
  // Recorrido específico seleccionado en la lista
  const [selectedAsignacionId, setSelectedAsignacionId] = useState(null);
  // Formulario de nuevo recorrido (solo hora_inicio)
  const [showNewRecorrido, setShowNewRecorrido] = useState(false);
  const [horaInicio, setHoraInicio] = useState("");
  const [formStatus, setFormStatus] = useState("");

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    getRutas()
      .then((r) => {
        const data = r.data || r || [];
        setRutas(data);
        if (data.length > 0) setSelectedRuta(data[0]);
      })
      .catch(() => undefined);
    getCamiones().then((r) => setCamiones(r.data || r || [])).catch(() => undefined);
    getPuntosControl().then((r) => setPuntosControl(r.data || r || [])).catch(() => undefined);
  }, []);

  // ── Al cambiar ruta: recargar asignaciones, limpiar camión / seguimiento ──
  useEffect(() => {
    if (!selectedRuta) {
      setAsignaciones([]);
      setSeguimiento(null);
      setSelectedCamionId("");
      return;
    }
    getRutaAsignaciones(selectedRuta.id_ruta)
      .then((r) => setAsignaciones(r.data || r || []))
      .catch(() => setAsignaciones([]));
    setSeguimiento(null);
    setSelectedCamionId("");
    setSelectedAsignacionId(null);
    setShowNewRecorrido(false);
  }, [selectedRuta]);

  // ── Polling de seguimiento cuando hay ruta + camión ──────────
  useEffect(() => {
    if (!selectedRuta || !selectedCamionId) {
      setSeguimiento(null);
      return;
    }
    const load = () => {
      getSeguimientoRuta(selectedRuta.id_ruta, selectedCamionId, selectedAsignacionId)
        .then((r) => setSeguimiento(r.data || r || null))
        .catch(() => undefined);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [selectedRuta, selectedCamionId, selectedAsignacionId]);

  // ── Crear nuevo recorrido ──────────────────────────────────────
  const onCrearRecorrido = async () => {
    if (!selectedRuta || !selectedCamionId || !horaInicio) return;
    try {
      await createRutaAsignacion({
        id_ruta: selectedRuta.id_ruta,
        id_camion: selectedCamionId,
        hora_inicio: new Date(horaInicio).toISOString(),
      });
      setFormStatus("Recorrido creado correctamente");
      setHoraInicio("");
      setShowNewRecorrido(false);
      const r = await getRutaAsignaciones(selectedRuta.id_ruta);
      setAsignaciones(r.data || r || []);
    } catch {
      setFormStatus("Error al crear el recorrido");
    }
  };

  // ── Datos del mapa ─────────────────────────────────────────────
  const rutaPuntos = selectedRuta
    ? (selectedRuta.puntos || [])
        .sort((a, b) => a.orden - b.orden)
        .map((p) => {
          const pc = puntosControl.find((c) => c.id_punto_control === p.id_punto_control);
          const seguPunto = seguimiento?.puntos?.find(
            (s) => s.id_punto_control === p.id_punto_control
          );
          return {
            id: p.id_punto_control,
            name: pc?.nombre || p.id_punto_control,
            order: p.orden,
            coords: parseCoords(pc?.cordenadas),
            status: seguPunto?.estado || "pendiente",
            time: seguPunto?.fecha_hora_paso || null,
          };
        })
    : [];

  const puntosConCoords = rutaPuntos.filter((p) => p.coords);

  const mapMarkers = puntosConCoords.map((p) => ({
    id: p.id,
    position: p.coords,
    label: `${p.order}. ${p.name}`,
  }));

  // Segmentos a → b → c con su estado
  const routeSegments = puntosConCoords.slice(0, -1).map((p, i) => {
    const next = puntosConCoords[i + 1];
    return {
      start: p.coords,
      end: next.coords,
      status: getSegmentStatus(p, next),
    };
  });

  const center =
    mapMarkers[1]?.position || mapMarkers[0]?.position || { lat: -33.4372, lng: -70.6506 };

  const completedCount = rutaPuntos.filter(
    (p) => p.status === "pasado" || p.status === "completed"
  ).length;
  const progress = rutaPuntos.length > 0
    ? Math.round((completedCount / rutaPuntos.length) * 100)
    : 0;

  // Nombre del camión seleccionado
  const camionSeleccionado = camiones.find((c) => String(c.id_camion) === String(selectedCamionId));

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Seguimiento de Rutas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitorea el progreso de las rutas en tiempo real
        </p>
      </header>

      {/* Selectores de Ruta y Camión */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Ruta */}
          <label className="text-sm font-medium text-gray-700">Ruta:</label>
          <select
            value={selectedRuta?.id_ruta || ""}
            onChange={(e) => {
              const r = rutas.find((x) => String(x.id_ruta) === e.target.value);
              setSelectedRuta(r || null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una ruta</option>
            {rutas.map((r) => (
              <option key={r.id_ruta} value={r.id_ruta}>
                {r.nombre}
              </option>
            ))}
          </select>

          {/* Camión — carga desde la lista real de camiones */}
          {selectedRuta && (
            <>
              <label className="text-sm font-medium text-gray-700">Camión:</label>
              <select
                value={selectedCamionId}
                onChange={(e) => {
                  setSelectedCamionId(e.target.value);
                  setSelectedAsignacionId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ver solo puntos</option>
                {camiones.map((c) => (
                  <option key={c.id_camion} value={c.id_camion}>
                    {c.patente}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="flex-1" />

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-1 bg-green-500 rounded" />
              <span className="text-gray-600">Completado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-8 h-1 bg-amber-500 rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 5px, transparent 5px, transparent 9px)",
                }}
              />
              <span className="text-gray-600">En Proceso</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-1 bg-gray-400 rounded opacity-50" />
              <span className="text-gray-600">Pendiente</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="size-4" />
            <span>{new Date().toLocaleDateString("es-CL")}</span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Mapa */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mapa de Ruta</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Puntos de control conectados con estado de progreso
            </p>
          </div>
          <div className="flex-1 relative min-h-[500px]">
            <GoogleMapView
              key={`${selectedRuta?.id_ruta || "sin-ruta"}-${selectedCamionId || "sin-camion"}-${selectedAsignacionId || "actual"}`}
              center={center}
              zoom={13}
              markers={mapMarkers}
              routeSegments={routeSegments}
              fitToData
            />
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6 overflow-auto">

          {/* ── Panel: Recorridos Camión ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Recorridos Camión</h3>
                {selectedRuta && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedRuta.nombre}</p>
                )}
              </div>

              {/* "+" solo aparece cuando hay ruta + camión seleccionados */}
              {selectedRuta && selectedCamionId && (
                <button
                  onClick={() => {
                    setShowNewRecorrido(!showNewRecorrido);
                    setFormStatus("");
                    setHoraInicio("");
                  }}
                  title="Registrar nuevo recorrido"
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {showNewRecorrido ? (
                    <X className="size-4 text-gray-500" />
                  ) : (
                    <Plus className="size-4 text-gray-500" />
                  )}
                </button>
              )}
            </div>

            {/* Formulario nuevo recorrido */}
            {showNewRecorrido && selectedRuta && selectedCamionId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-4 bg-blue-50 border-b border-blue-100 space-y-3"
              >
                {/* Info del recorrido a crear */}
                <div className="flex items-center gap-2 text-xs text-blue-800 bg-blue-100 px-3 py-2 rounded-lg">
                  <Truck className="size-3.5 shrink-0" />
                  <span className="font-medium">{camionSeleccionado?.patente || selectedCamionId}</span>
                  <span className="text-blue-500">→</span>
                  <span>{selectedRuta.nombre}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha y hora de inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <button
                  onClick={onCrearRecorrido}
                  disabled={!horaInicio}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Registrar Recorrido
                </button>

                {formStatus && (
                  <p className="text-xs text-center text-gray-600">{formStatus}</p>
                )}
              </motion.div>
            )}

            {/* Lista de recorridos */}
            <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
              {asignaciones.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  {selectedRuta ? "Sin recorridos registrados" : "Selecciona una ruta"}
                </div>
              ) : (
                asignaciones.map((a) => {
                  const isSelected = selectedAsignacionId === a.id_asignacion_ruta;
                  return (
                    <button
                      key={a.id_asignacion_ruta}
                      onClick={() => {
                        setSelectedAsignacionId(a.id_asignacion_ruta);
                        setSelectedCamionId(String(a.id_camion));
                      }}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Truck
                            className={`size-4 shrink-0 ${isSelected ? "text-blue-500" : "text-gray-400"}`}
                          />
                          <span
                            className={`text-sm font-medium truncate ${
                              isSelected ? "text-blue-700" : "text-gray-900"
                            }`}
                          >
                            {a.patente || a.id_camion}
                          </span>
                        </div>
                        {/* Badge de estado */}
                        {a.activa ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                            <span className="size-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                            En Progreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                            <CheckCircle2 className="size-3" />
                            Finalizado
                          </span>
                        )}
                      </div>

                      {/* Fecha de inicio */}
                      {a.hora_inicio && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="size-3" />
                          <span>
                            {new Date(a.hora_inicio).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-gray-300">·</span>
                          <Clock className="size-3" />
                          <span>
                            {new Date(a.hora_inicio).toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* ── Panel: Progreso de Ruta ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Progreso de Ruta</h3>
              {selectedCamionId && camionSeleccionado && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {camionSeleccionado.patente}
                </span>
              )}
            </div>
            <div className="p-6">
              {/* Barra de progreso */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Completado</span>
                  <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-green-500 to-amber-500"
                  />
                </div>
              </div>

              {/* Lista de puntos */}
              <div className="space-y-3">
                {rutaPuntos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center">
                    Selecciona una ruta para ver sus puntos
                  </p>
                ) : (
                  rutaPuntos.map((punto) => {
                    const sc = getStatusConfig(punto.status);
                    return (
                      <div key={punto.id} className="flex items-start gap-3">
                        <div
                          className={`mt-1 size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${sc.cls}`}
                        >
                          {punto.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{punto.name}</div>
                          {punto.time && (
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(punto.time).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                        {(punto.status === "pasado" || punto.status === "completed") && (
                          <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" />
                        )}
                        {(punto.status === "en_punto" || punto.status === "in_progress") && (
                          <Loader2 className="size-5 text-amber-500 animate-spin shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
