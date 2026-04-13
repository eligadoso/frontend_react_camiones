import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  PlusCircle,
  RotateCcw,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  agregarPuntoRecorrido,
  createRutaAsignacion,
  getCamiones,
  getPuntosControl,
  getRutaAsignaciones,
  getRutas,
  getSeguimientoRuta,
  recargarRutaRecorrido,
} from "../api/operationsApi";
import GoogleMapView from "../components/GoogleMapView";

// ── Helpers de coords ──────────────────────────────────────────────────────
function parseCoords(cordenadas) {
  if (!cordenadas) return null;
  try {
    if (typeof cordenadas === "object") {
      if (Array.isArray(cordenadas) && cordenadas.length === 2)
        return { lat: Number(cordenadas[0]), lng: Number(cordenadas[1]) };
      if ("lat" in cordenadas && "lng" in cordenadas) return cordenadas;
      if ("latitude" in cordenadas && "longitude" in cordenadas)
        return { lat: Number(cordenadas.latitude), lng: Number(cordenadas.longitude) };
    }
    const parts = String(cordenadas).trim().split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
      return { lat: parts[0], lng: parts[1] };
  } catch { /* ignore */ }
  return null;
}

// ── Helpers de estado de punto ─────────────────────────────────────────────
const isCompletedStatus = (s) => s === "pasado" || s === "completed";
const isInProgressStatus = (s) => s === "en_punto" || s === "in_progress";
const isSkippedStatus = (s) => s === "omitido";

/** Clase Tailwind de la burbuja numerada según estado */
const pointBubbleCls = (estado) => {
  if (isCompletedStatus(estado)) return "bg-green-100 text-green-700";
  if (isSkippedStatus(estado))   return "bg-red-100 text-red-700";
  if (isInProgressStatus(estado)) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-500";
};

/** Opciones del segmento de mapa entre dos puntos consecutivos */
const getSegmentOptions = (current, next) => {
  if (!current || !next) return { status: "pending" };
  if (isSkippedStatus(next.status))   return { status: "skipped", color: "#ef4444" };
  if (isCompletedStatus(next.status)) return { status: "completed" };
  if (isInProgressStatus(next.status)) return { status: "in_progress" };
  if (isCompletedStatus(current.status) && next.status === "pendiente")
    return { status: "in_progress" };
  return { status: "pending" };
};

// ── Constantes de estado de recorrido ─────────────────────────────────────
const ESTADOS_EDITABLES = new Set(["en_proceso", "agendado"]);

// ── Componente principal ───────────────────────────────────────────────────
export function RouteTrackingPage() {
  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [puntosControl, setPuntosControl] = useState([]);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [seguimiento, setSeguimiento] = useState(null);
  const [selectedCamionId, setSelectedCamionId] = useState("");
  const [selectedAsignacionId, setSelectedAsignacionId] = useState(null);

  // ── Form: nuevo recorrido ──────────────────────────────────────────────
  const [showNewRecorrido, setShowNewRecorrido] = useState(false);
  const [horaInicio, setHoraInicio] = useState("");
  const [formStatus, setFormStatus] = useState("");

  // ── Form: añadir punto ────────────────────────────────────────────────
  const [showAddPunto, setShowAddPunto] = useState(false);
  const [addPuntoId, setAddPuntoId] = useState("");
  const [addPuntoOrden, setAddPuntoOrden] = useState("");
  const [addPuntoStatus, setAddPuntoStatus] = useState(null); // null | { type, msg }
  const [isAddingPunto, setIsAddingPunto] = useState(false);

  // ── Estado recarga ruta ────────────────────────────────────────────────
  const [recargarStatus, setRecargarStatus] = useState(null); // null | { type, msg, motivos? }
  const [isRecargando, setIsRecargando] = useState(false);

  // ── Ref para detectar transición de estado del recorrido ──────────────
  const prevEstadoRecorridoRef = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────
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

  // ── Al cambiar ruta ────────────────────────────────────────────────────
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
    setShowAddPunto(false);
    setRecargarStatus(null);
  }, [selectedRuta]);

  // ── Polling de seguimiento ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRuta || !selectedCamionId) { setSeguimiento(null); return; }
    // Resetear ref al cambiar camión/asignación para evitar comparaciones incorrectas
    prevEstadoRecorridoRef.current = null;
    const load = async () => {
      try {
        const r = await getSeguimientoRuta(selectedRuta.id_ruta, selectedCamionId, selectedAsignacionId);
        const data = r.data || r || null;
        setSeguimiento(data);
        const nuevoEstado = data?.estado_recorrido ?? null;
        const prevEstado = prevEstadoRecorridoRef.current;
        prevEstadoRecorridoRef.current = nuevoEstado;
        // Refrescar lista de asignaciones cuando:
        // 1. El recorrido acaba de finalizar (transición a "finalizado")
        // 2. auto_completado indica que se completó una ruta legacy
        // 3. El estado pasó de "finalizado" a otro (siguiente agendado activado)
        const debeRecargar =
          data?.auto_completado ||
          (nuevoEstado === "finalizado" && prevEstado !== "finalizado") ||
          (prevEstado === "finalizado" && nuevoEstado !== "finalizado" && nuevoEstado !== null);
        if (debeRecargar) {
          getRutaAsignaciones(selectedRuta.id_ruta)
            .then((res) => setAsignaciones(res.data || res || []))
            .catch(() => undefined);
        }
      } catch { /* silencioso */ }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [selectedRuta, selectedCamionId, selectedAsignacionId]);

  // ── Estado editable del recorrido activo ──────────────────────────────
  const estadoRecorrido =
    seguimiento?.estado_recorrido ||
    asignaciones.find((a) => a.id_asignacion_ruta === selectedAsignacionId)?.estado_recorrido ||
    null;
  const puedeEditar = ESTADOS_EDITABLES.has(estadoRecorrido);
  const idAsignacionActiva = selectedAsignacionId || seguimiento?.id_asignacion_ruta;

  // ── Handlers ──────────────────────────────────────────────────────────
  const recargarAsignaciones = async () => {
    if (!selectedRuta) return;
    const r = await getRutaAsignaciones(selectedRuta.id_ruta);
    setAsignaciones(r.data || r || []);
  };

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
      await recargarAsignaciones();
    } catch {
      setFormStatus("Error al crear el recorrido");
    }
  };

  const onAgregarPunto = async () => {
    if (!idAsignacionActiva || !addPuntoId) return;
    setIsAddingPunto(true);
    setAddPuntoStatus(null);
    try {
      const payload = { id_punto_control: addPuntoId };
      if (addPuntoOrden.trim()) payload.orden = parseInt(addPuntoOrden, 10);
      const r = await agregarPuntoRecorrido(idAsignacionActiva, payload);
      setAddPuntoStatus({ type: "ok", msg: `Punto agregado correctamente (total: ${r.total_puntos})` });
      setAddPuntoId("");
      setAddPuntoOrden("");
      setShowAddPunto(false);
      // Refrescar seguimiento
      if (selectedRuta && selectedCamionId) {
        const s = await getSeguimientoRuta(selectedRuta.id_ruta, selectedCamionId, selectedAsignacionId);
        setSeguimiento(s.data || s || null);
      }
    } catch (e) {
      const msg = e?.message || "Error al agregar el punto";
      setAddPuntoStatus({ type: "error", msg });
    } finally {
      setIsAddingPunto(false);
    }
  };

  const onRecargarRuta = async () => {
    if (!idAsignacionActiva) return;
    setIsRecargando(true);
    setRecargarStatus(null);
    try {
      const r = await recargarRutaRecorrido(idAsignacionActiva);
      const resultado = r.resultado || r.status;
      if (resultado === "ambiguo") {
        setRecargarStatus({ type: "warn", msg: r.mensaje, motivos: r.motivos });
      } else if (resultado === "sin_cambios") {
        setRecargarStatus({ type: "info", msg: r.mensaje });
      } else {
        setRecargarStatus({ type: "ok", msg: r.mensaje });
        // Refrescar seguimiento
        if (selectedRuta && selectedCamionId) {
          const s = await getSeguimientoRuta(selectedRuta.id_ruta, selectedCamionId, selectedAsignacionId);
          setSeguimiento(s.data || s || null);
        }
      }
    } catch (e) {
      setRecargarStatus({ type: "error", msg: e?.message || "Error al recargar la ruta" });
    } finally {
      setIsRecargando(false);
    }
  };

  // ── Datos del mapa ─────────────────────────────────────────────────────
  const rutaPuntos = (() => {
    if (seguimiento?.puntos?.length) {
      return seguimiento.puntos
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((p) => {
          const pc = puntosControl.find((c) => c.id_punto_control === p.id_punto_control);
          return {
            id: p.id_punto_control,
            name: p.nombre_punto || pc?.nombre || p.id_punto_control,
            order: p.orden,
            coords: parseCoords(pc?.cordenadas),
            status: p.estado || "pendiente",
            time: p.fecha_hora_paso || null,
          };
        });
    }
    if (!selectedRuta) return [];
    return (selectedRuta.puntos || [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((p) => {
        const pc = puntosControl.find((c) => c.id_punto_control === p.id_punto_control);
        return {
          id: p.id_punto_control,
          name: pc?.nombre || p.id_punto_control,
          order: p.orden,
          coords: parseCoords(pc?.cordenadas),
          status: "pendiente",
          time: null,
        };
      });
  })();

  const puntosConCoords = rutaPuntos.filter((p) => p.coords);

  // Marcadores del mapa: omitidos en rojo, resto en azul/verde por defecto
  const mapMarkers = puntosConCoords.map((p) => ({
    id: p.id,
    position: p.coords,
    label: `${p.order}. ${p.name}`,
    markerColor: isSkippedStatus(p.status) ? "red" : isCompletedStatus(p.status) ? "green" : undefined,
  }));

  // Segmentos con color para omitidos
  const routeSegments = puntosConCoords.slice(0, -1).map((p, i) => {
    const next = puntosConCoords[i + 1];
    const opts = getSegmentOptions(p, next);
    return { start: p.coords, end: next.coords, ...opts };
  });

  const center = mapMarkers[1]?.position || mapMarkers[0]?.position || { lat: -33.4372, lng: -70.6506 };

  // ── Métricas de progreso ───────────────────────────────────────────────
  const total = rutaPuntos.length;
  const pasadoCount = rutaPuntos.filter((p) => isCompletedStatus(p.status)).length;
  const omitidoCount = rutaPuntos.filter((p) => isSkippedStatus(p.status)).length;
  const processedCount = pasadoCount + omitidoCount;
  const progress = total > 0 ? Math.round((processedCount / total) * 100) : 0;
  const greenPct = total > 0 ? (pasadoCount / total) * 100 : 0;
  const redPct = total > 0 ? (omitidoCount / total) * 100 : 0;

  const camionSeleccionado = camiones.find((c) => String(c.id_camion) === String(selectedCamionId));

  // Puntos disponibles para añadir (excluir los que ya están en el snapshot del recorrido)
  const idsEnRecorrido = new Set(rutaPuntos.map((p) => p.id));
  const puntosDisponibles = puntosControl.filter((pc) => !idsEnRecorrido.has(pc.id_punto_control));

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Seguimiento de Rutas</h1>
        <p className="text-sm text-gray-500 mt-1">Monitorea el progreso de las rutas en tiempo real</p>
      </header>

      {/* Selectores */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Ruta:</label>
          <select
            value={selectedRuta?.id_ruta || ""}
            onChange={(e) => setSelectedRuta(rutas.find((x) => String(x.id_ruta) === e.target.value) || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una ruta</option>
            {rutas.map((r) => <option key={r.id_ruta} value={r.id_ruta}>{r.nombre}</option>)}
          </select>

          {selectedRuta && (
            <>
              <label className="text-sm font-medium text-gray-700">Camión:</label>
              <select
                value={selectedCamionId}
                onChange={(e) => { setSelectedCamionId(e.target.value); setSelectedAsignacionId(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ver solo puntos</option>
                {camiones.map((c) => <option key={c.id_camion} value={c.id_camion}>{c.patente}</option>)}
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
              <div className="w-8 h-1 bg-red-500 rounded" />
              <span className="text-gray-600">Omitido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-1 bg-amber-500 rounded" style={{ backgroundImage: "repeating-linear-gradient(to right,#f59e0b 0,#f59e0b 5px,transparent 5px,transparent 9px)" }} />
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
            <p className="text-sm text-gray-500 mt-0.5">Puntos de control conectados con estado de progreso</p>
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
                {selectedRuta && <p className="text-xs text-gray-400 mt-0.5">{selectedRuta.nombre}</p>}
              </div>
              {selectedRuta && selectedCamionId && (
                <button
                  onClick={() => { setShowNewRecorrido(!showNewRecorrido); setFormStatus(""); setHoraInicio(""); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Registrar nuevo recorrido"
                >
                  {showNewRecorrido ? <X className="size-4 text-gray-500" /> : <Plus className="size-4 text-gray-500" />}
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
                <div className="flex items-center gap-2 text-xs text-blue-800 bg-blue-100 px-3 py-2 rounded-lg">
                  <Truck className="size-3.5 shrink-0" />
                  <span className="font-medium">{camionSeleccionado?.patente || selectedCamionId}</span>
                  <span className="text-blue-500">→</span>
                  <span>{selectedRuta.nombre}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha y hora de inicio</label>
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
                {formStatus && <p className="text-xs text-center text-gray-600">{formStatus}</p>}
              </motion.div>
            )}

            {/* Lista de recorridos */}
            <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
              {(() => {
                const visibles = selectedCamionId
                  ? asignaciones.filter((a) => String(a.id_camion) === String(selectedCamionId))
                  : asignaciones;
                if (!selectedRuta) return <div className="p-6 text-center text-sm text-gray-400">Selecciona una ruta</div>;
                if (visibles.length === 0) return (
                  <div className="p-6 text-center text-sm text-gray-400">
                    {selectedCamionId ? "Sin recorridos para este camión" : "Sin recorridos registrados"}
                  </div>
                );
                return visibles.map((a) => {
                  const isSelected = selectedAsignacionId === a.id_asignacion_ruta;
                  const estado = a.estado_recorrido || (a.activa ? "en_proceso" : "finalizado");
                  return (
                    <button
                      key={a.id_asignacion_ruta}
                      onClick={() => { setSelectedAsignacionId(a.id_asignacion_ruta); setSelectedCamionId(String(a.id_camion)); }}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Truck className={`size-4 shrink-0 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
                          <span className={`text-sm font-medium truncate ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                            {a.patente || a.id_camion}
                          </span>
                        </div>
                        {/* Badge de estado */}
                        {estado === "en_proceso" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                            <span className="size-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                            En Proceso
                          </span>
                        ) : estado === "agendado" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 shrink-0">
                            <CalendarClock className="size-3" />
                            Agendado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                            <CheckCircle2 className="size-3" />
                            {estado === "cancelado" ? "Cancelado" : "Finalizado"}
                          </span>
                        )}
                      </div>
                      {a.conductor_nombre && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Users className="size-3 shrink-0" />
                          <span className="truncate">{a.conductor_nombre}</span>
                        </div>
                      )}
                      {a.hora_inicio && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="size-3" />
                          <span>{new Date(a.hora_inicio).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                          <span className="text-gray-300">·</span>
                          <Clock className="size-3" />
                          <span>{new Date(a.hora_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </motion.div>

          {/* ── Panel: Progreso de Ruta ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Header del panel con acciones */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Progreso de Ruta</h3>
              <div className="flex items-center gap-2">
                {selectedCamionId && camionSeleccionado && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {camionSeleccionado.patente}
                  </span>
                )}
                {/* Acciones: solo para recorridos editables */}
                {puedeEditar && idAsignacionActiva && (
                  <>
                    <button
                      onClick={() => { setShowAddPunto(!showAddPunto); setAddPuntoStatus(null); setRecargarStatus(null); }}
                      title="Añadir punto adicional"
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <PlusCircle className="size-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => { setRecargarStatus(null); setShowAddPunto(false); onRecargarRuta(); }}
                      title="Recargar ruta desde la ruta maestra"
                      disabled={isRecargando}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`size-4 text-indigo-500 ${isRecargando ? "animate-spin" : ""}`} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Form: Añadir punto adicional ── */}
            {showAddPunto && puedeEditar && idAsignacionActiva && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="px-4 py-4 bg-blue-50 border-b border-blue-100 space-y-3"
              >
                <p className="text-xs font-medium text-blue-800">Añadir punto de control al recorrido</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Punto de control</label>
                  <select
                    value={addPuntoId}
                    onChange={(e) => setAddPuntoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecciona un punto</option>
                    {puntosDisponibles.map((pc) => (
                      <option key={pc.id_punto_control} value={pc.id_punto_control}>
                        {pc.nombre || pc.id_punto_control}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Orden (opcional — vacío = al final)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={addPuntoOrden}
                    onChange={(e) => setAddPuntoOrden(e.target.value)}
                    placeholder="Ej: 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onAgregarPunto}
                    disabled={!addPuntoId || isAddingPunto}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAddingPunto ? "Agregando…" : "Agregar punto"}
                  </button>
                  <button
                    onClick={() => { setShowAddPunto(false); setAddPuntoStatus(null); }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                {addPuntoStatus && (
                  <p className={`text-xs ${addPuntoStatus.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                    {addPuntoStatus.msg}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Resultado de recarga ruta ── */}
            {recargarStatus && (
              <div className={`px-4 py-3 border-b text-xs space-y-1
                ${recargarStatus.type === "ok" ? "bg-green-50 border-green-100 text-green-700" :
                  recargarStatus.type === "warn" ? "bg-amber-50 border-amber-100 text-amber-700" :
                  recargarStatus.type === "info" ? "bg-gray-50 border-gray-100 text-gray-600" :
                  "bg-red-50 border-red-100 text-red-700"}`}
              >
                <div className="flex items-start gap-1.5">
                  {recargarStatus.type === "warn" && <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />}
                  <p>{recargarStatus.msg}</p>
                </div>
                {recargarStatus.motivos?.map((m, i) => (
                  <p key={i} className="pl-5 opacity-80">• {m}</p>
                ))}
                <button
                  onClick={() => setRecargarStatus(null)}
                  className="text-xs underline opacity-60 hover:opacity-100 mt-1"
                >
                  Cerrar
                </button>
              </div>
            )}

            <div className="p-6">
              {/* ── Barra de progreso segmentada ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Avance</span>
                  <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                {/* Leyenda de desglose (solo si hay omitidos) */}
                {omitidoCount > 0 && (
                  <div className="flex items-center gap-3 text-xs mb-2">
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      {pasadoCount} completado{pasadoCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      {omitidoCount} omitido{omitidoCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {/* Barra segmentada: verde | rojo | gris */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${greenPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-green-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${redPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-red-500"
                  />
                </div>
              </div>

              {/* ── Lista de puntos de control ── */}
              <div className="space-y-3">
                {rutaPuntos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center">Selecciona una ruta para ver sus puntos</p>
                ) : (
                  rutaPuntos.map((punto) => {
                    const bubbleCls = pointBubbleCls(punto.status);
                    const isOmitido = isSkippedStatus(punto.status);
                    const isCompleted = isCompletedStatus(punto.status);
                    const isEnPunto = isInProgressStatus(punto.status);
                    return (
                      <div key={punto.id} className="flex items-start gap-3">
                        {/* Burbuja numerada */}
                        <div className={`mt-1 size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${bubbleCls}`}>
                          {punto.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isOmitido ? "text-red-600 line-through" : "text-gray-900"}`}>
                            {punto.name}
                          </div>
                          {isOmitido && (
                            <div className="text-xs text-red-500 mt-0.5">Punto omitido</div>
                          )}
                          {punto.time && (
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(punto.time).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </div>
                        {/* Ícono de estado */}
                        {isCompleted && <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" />}
                        {isOmitido && <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />}
                        {isEnPunto && <Loader2 className="size-5 text-amber-500 animate-spin shrink-0 mt-0.5" />}
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
