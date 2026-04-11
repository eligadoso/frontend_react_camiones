import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MapPin, Save, Trash2, Plus, X, Edit } from "lucide-react";
import {
  getPuntosControl,
  createPuntoControl,
  updatePuntoControl,
  deletePuntoControl,
} from "../api/operationsApi";
import GoogleMapView from "../components/GoogleMapView";

function parseCoords(cordenadas) {
  if (!cordenadas) return null;
  try {
    if (typeof cordenadas === "object") return cordenadas;
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

function coordsToString(coords) {
  if (!coords) return "";
  return `${coords.lat},${coords.lng}`;
}

const emptyForm = {
  nombre: "",
  ubicacion: "",
  coords: null,
  id_zona: "",
  tipo_punto: "checkpoint",
  id_esp32: "",
  activo: true,
};

export function CheckpointManagerPage() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "create" | "edit"
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");

  const loadCheckpoints = () => {
    getPuntosControl()
      .then((r) => setCheckpoints(r.data || r || []))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadCheckpoints();
  }, []);

  const handleMapClick = (position) => {
    if (mode === "create" || mode === "edit") {
      setForm((f) => ({ ...f, coords: position }));
    }
  };

  const handleSave = async () => {
    if (!form.nombre || !form.coords || !form.id_esp32) return;
    const payload = {
      nombre: form.nombre,
      ubicacion: form.ubicacion || null,
      cordenadas: coordsToString(form.coords),
      id_zona: form.id_zona || null,
      tipo_punto: form.tipo_punto,
      id_esp32: form.id_esp32,
      activo: form.activo,
    };
    try {
      if (mode === "create") {
        await createPuntoControl(payload);
        setStatus("Punto de control creado");
      } else if (mode === "edit" && selectedId) {
        await updatePuntoControl(selectedId, payload);
        setStatus("Punto de control actualizado");
      }
      loadCheckpoints();
      setMode("view");
      setForm(emptyForm);
      setSelectedId(null);
    } catch {
      setStatus("Error al guardar el punto");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePuntoControl(id);
      setStatus("Punto eliminado");
      loadCheckpoints();
      if (selectedId === id) {
        setSelectedId(null);
        setMode("view");
        setForm(emptyForm);
      }
    } catch {
      setStatus("Error al eliminar el punto");
    }
  };

  const handleSelect = (checkpoint) => {
    if (mode !== "view") return;
    setSelectedId(checkpoint.id_punto_control);
  };

  const handleEdit = (checkpoint) => {
    const coords = parseCoords(checkpoint.cordenadas);
    setForm({
      nombre: checkpoint.nombre || "",
      ubicacion: checkpoint.ubicacion || "",
      coords,
      id_zona: checkpoint.id_zona || "",
      tipo_punto: checkpoint.tipo_punto || "checkpoint",
      id_esp32: checkpoint.id_esp32 || "",
      activo: checkpoint.activo !== false,
    });
    setSelectedId(checkpoint.id_punto_control);
    setMode("edit");
  };

  const handleCancel = () => {
    setMode("view");
    setForm(emptyForm);
    setSelectedId(null);
    setStatus("");
  };

  const selectedCheckpoint = checkpoints.find((c) => c.id_punto_control === selectedId);

  const mapMarkers = [
    ...checkpoints.map((cp) => {
      const coords = parseCoords(cp.cordenadas);
      if (!coords) return null;
      return {
        id: cp.id_punto_control,
        position: coords,
        label: cp.nombre || cp.id_punto_control,
        onClick: () => handleSelect(cp),
      };
    }).filter(Boolean),
    ...(form.coords && (mode === "create" || mode === "edit")
      ? [{ id: "__new__", position: form.coords, label: form.nombre || "Nuevo punto", icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }]
      : []),
  ];

  const validCheckpoints = checkpoints.filter((cp) => parseCoords(cp.cordenadas));
  const center =
    (validCheckpoints[0] && parseCoords(validCheckpoints[0].cordenadas)) ||
    { lat: -33.4372, lng: -70.6506 };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Gestión de Puntos de Control
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Administra y visualiza puntos de control en el mapa
            </p>
          </div>
          <button
            onClick={() => {
              if (mode === "create") {
                handleCancel();
              } else {
                setMode("create");
                setForm(emptyForm);
                setSelectedId(null);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              mode === "create"
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {mode === "create" ? (
              <>
                <X className="size-4" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Nuevo Punto
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mapa de Ubicaciones</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {mode !== "view"
                ? "Haz clic en el mapa para seleccionar las coordenadas"
                : "Selecciona un punto para ver sus detalles"}
            </p>
          </div>
          <div className="flex-1 relative min-h-[500px]">
            <GoogleMapView
              center={center}
              zoom={12}
              markers={mapMarkers}
              onClick={handleMapClick}
            />
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6 overflow-auto">
          {/* Create / Edit Form */}
          {(mode === "create" || mode === "edit") && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900">
                  {mode === "create" ? "Nuevo Punto de Control" : "Editar Punto de Control"}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: PC-05"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    placeholder="Ej: Bodega Principal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Zona</label>
                  <input
                    type="text"
                    value={form.id_zona}
                    onChange={(e) => setForm({ ...form, id_zona: e.target.value })}
                    placeholder="Ej: ZONA-A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID ESP32 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.id_esp32}
                    onChange={(e) => setForm({ ...form, id_esp32: e.target.value })}
                    placeholder="Ej: ESP32-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo_punto}
                    onChange={(e) => setForm({ ...form, tipo_punto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="checkpoint">checkpoint</option>
                    <option value="porton_entrada">porton_entrada</option>
                    <option value="porton_salida">porton_salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordenadas
                  </label>
                  {form.coords ? (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700">
                      {form.coords.lat.toFixed(6)}, {form.coords.lng.toFixed(6)}
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      Haz clic en el mapa para seleccionar
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.nombre || !form.coords || !form.id_esp32}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="size-4" />
                    Guardar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                {status && <p className="text-xs text-gray-600">{status}</p>}
              </div>
            </motion.div>
          )}

          {/* Selected Checkpoint Details */}
          {mode === "view" && selectedCheckpoint && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {selectedCheckpoint.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedCheckpoint.ubicacion || "Sin ubicación"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
                  <div className="text-sm text-gray-900">
                    {selectedCheckpoint.id_zona || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                  <div className="text-sm text-gray-900 capitalize">
                    {selectedCheckpoint.tipo_punto || "checkpoint"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Coordenadas
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">
                    {selectedCheckpoint.cordenadas || "Sin coordenadas"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      selectedCheckpoint.activo !== false
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedCheckpoint.activo !== false ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleEdit(selectedCheckpoint)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="size-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(selectedCheckpoint.id_punto_control)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Checkpoints List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Puntos de Control</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {checkpoints.length} punto{checkpoints.length !== 1 ? "s" : ""} registrado
                {checkpoints.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="max-h-96 overflow-auto">
              <div className="divide-y divide-gray-100">
                {checkpoints.map((cp) => (
                  <button
                    key={cp.id_punto_control}
                    onClick={() => handleSelect(cp)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedId === cp.id_punto_control && mode === "view"
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className={`size-4 mt-0.5 ${
                            selectedId === cp.id_punto_control && mode === "view"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {cp.nombre || cp.id_punto_control}
                          </div>
                          {cp.ubicacion && (
                            <div className="text-xs text-gray-500 mt-0.5">{cp.ubicacion}</div>
                          )}
                          {cp.id_zona && (
                            <div className="text-xs text-gray-400 mt-1">{cp.id_zona}</div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          cp.activo !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {cp.activo !== false ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
