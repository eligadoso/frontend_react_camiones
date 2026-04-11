import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Truck,
  CreditCard,
  MapPin,
  Route,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  X,
  Save,
  Link,
  Unlink,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getCamiones,
  getConductores,
  getTags,
  asignarCamionAConductor,
  asignarConductorACamion,
  createCamion,
  updateCamion,
  createConductor,
  updateConductor,
  updateTag,
  deleteTag,
  deleteCamion,
  deleteConductor,
  desasignarCamionDeConductor,
  desasignarConductorDeCamion,
  asignarConductorATag,
  desasignarConductorDeTag,
  getPuntosControl,
  createPuntoControl,
  updatePuntoControl,
  deletePuntoControl,
  getTiposPuntoControl,
  createTipoPuntoControl,
  updateTipoPuntoControl,
  deleteTipoPuntoControl,
  getRutas,
  createRuta,
  updateRuta,
  deleteRuta,
} from "../api/operationsApi";
import GoogleMapView from "../components/GoogleMapView";

// ── helpers ────────────────────────────────────────────────────────────────
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
    const parts = String(cordenadas).split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
      return { lat: parts[0], lng: parts[1] };
  } catch { /* ignore */ }
  return null;
}

function coordsToString(c) {
  return c ? `${c.lat},${c.lng}` : "";
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message);
      return parsed?.detail || fallback;
    } catch {
      return error.message || fallback;
    }
  }
  return fallback;
}

// ── Conductores ────────────────────────────────────────────────────────────
function DriversTab({ searchTerm }) {
  const [drivers, setDrivers] = useState([]);
  const [tags, setTags] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [assigningDriver, setAssigningDriver] = useState(null); // driver to assign tag to
  const [assigningTruckDriver, setAssigningTruckDriver] = useState(null);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [form, setForm] = useState({ rut: "", nombre: "", apellido: "", telefono: "", licencia: "" });
  const [status, setStatus] = useState("");

  const load = () => {
    getConductores().then((r) => setDrivers(r.data || r || [])).catch(() => undefined);
    getTags().then((r) => setTags(r.data || r || [])).catch(() => undefined);
    getCamiones().then((r) => setTrucks(r.data || r || [])).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditDriver(null);
    setForm({ rut: "", nombre: "", apellido: "", telefono: "", licencia: "" });
    setShowForm(true);
    setAssigningDriver(null);
    setAssigningTruckDriver(null);
    setStatus("");
  };
  const openEdit = (d) => {
    setEditDriver(d);
    setForm({ rut: d.rut || "", nombre: d.nombre || "", apellido: d.apellido || "", telefono: d.telefono || "", licencia: d.licencia || "" });
    setShowForm(true);
    setAssigningDriver(null);
    setAssigningTruckDriver(null);
    setStatus("");
  };
  const openAssign = (d) => {
    setAssigningDriver(d);
    setSelectedTagId("");
    setShowForm(false);
    setAssigningTruckDriver(null);
    setStatus("");
  };
  const openAssignTruck = (d) => {
    setAssigningTruckDriver(d);
    setSelectedTruckId(d.camion?.id_camion || d.id_camion || "");
    setShowForm(false);
    setAssigningDriver(null);
    setStatus("");
  };
  const closeAll = () => {
    setShowForm(false);
    setEditDriver(null);
    setAssigningDriver(null);
    setAssigningTruckDriver(null);
    setStatus("");
  };

  const onSave = async () => {
    try {
      if (editDriver) {
        await updateConductor(editDriver.id_conductor, { nombre: form.nombre, apellido: form.apellido, telefono: form.telefono, licencia: form.licencia });
        setStatus("Conductor actualizado");
      } else {
        await createConductor(form);
        setStatus("Conductor registrado");
      }
      closeAll();
      load();
    } catch (error) { setStatus(getErrorMessage(error, "Error al guardar conductor")); }
  };

  const onDelete = async (id) => {
    try { await deleteConductor(id); load(); } catch (error) { setStatus(getErrorMessage(error, "Error al eliminar")); }
  };

  const onAssignTag = async () => {
    if (!assigningDriver || !selectedTagId) return;
    try {
      await asignarConductorATag(selectedTagId, assigningDriver.id_conductor);
      setStatus("Tag asignado correctamente");
      setAssigningDriver(null);
      load();
    } catch (e) {
      setStatus(getErrorMessage(e, "Error al asignar tag"));
    }
  };

  const onUnassignTag = async (driver) => {
    // Find the tag assigned to this driver
    const tag = tags.find((t) => t.id_conductor === driver.id_conductor);
    if (!tag) return;
    try { await desasignarConductorDeTag(tag.id_tag); load(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al desasignar tag")); }
  };

  const onAssignTruck = async () => {
    if (!assigningTruckDriver || !selectedTruckId) return;
    try {
      await asignarCamionAConductor(assigningTruckDriver.id_conductor, selectedTruckId);
      setStatus("Camión asignado correctamente");
      setAssigningTruckDriver(null);
      load();
    } catch (error) {
      setStatus(getErrorMessage(error, "Error al asignar camión"));
    }
  };

  const onUnassignTruck = async (driver) => {
    try {
      await desasignarCamionDeConductor(driver.id_conductor);
      load();
    } catch (error) {
      setStatus(getErrorMessage(error, "Error al desasignar camión"));
    }
  };

  // Unassigned tags + the tag currently assigned to the conductor being assigned
  const availableTags = tags.filter(
    (t) => !t.id_conductor || (assigningDriver && t.id_conductor === assigningDriver.id_conductor)
  );

  const availableTrucks = trucks.filter(
    (truck) =>
      !truck.id_conductor ||
      (assigningTruckDriver && truck.id_conductor === assigningTruckDriver.id_conductor) ||
      (assigningTruckDriver && truck.id_camion === assigningTruckDriver.camion?.id_camion)
  );

  const filtered = drivers.filter(
    (d) => !searchTerm || `${d.nombre} ${d.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) || d.rut?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={showForm ? closeAll : openCreate} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {showForm ? <><X className="size-4" />Cancelar</> : <><Plus className="size-4" />Nuevo Conductor</>}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editDriver ? "Editar Conductor" : "Nuevo Conductor"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "rut", placeholder: "RUT", disabled: !!editDriver },
              { key: "nombre", placeholder: "Nombre" },
              { key: "apellido", placeholder: "Apellido" },
              { key: "telefono", placeholder: "Teléfono" },
              { key: "licencia", placeholder: "Licencia" },
            ].map(({ key, placeholder, disabled }) => (
              <input key={key} type="text" placeholder={placeholder} disabled={disabled} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400" />
            ))}
            <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Save className="size-4" />{editDriver ? "Actualizar" : "Registrar"}
            </button>
          </div>
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}

      {assigningDriver && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="size-4 text-blue-500" />
                Asignar Tag a: {assigningDriver.nombre} {assigningDriver.apellido}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Solo se muestran tags sin conductor asignado</p>
            </div>
            <button onClick={() => setAssigningDriver(null)}><X className="size-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {/* Current assignment */}
          {assigningDriver.tag && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CreditCard className="size-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Tag actual: <span className="font-mono">{assigningDriver.tag.uid_tag}</span></p>
                {assigningDriver.tag.codigo_interno && <p className="text-xs text-green-700">{assigningDriver.tag.codigo_interno}</p>}
              </div>
              <button onClick={() => onUnassignTag(assigningDriver)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1">
                <Unlink className="size-3" />Quitar
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar tag...</option>
              {availableTags.map((t) => (
                <option key={t.id_tag} value={t.id_tag}>{t.uid_tag}{t.codigo_interno ? ` — ${t.codigo_interno}` : ""}</option>
              ))}
            </select>
            <button onClick={onAssignTag} disabled={!selectedTagId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <Link className="size-4" />Asignar
            </button>
          </div>
          {availableTags.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">No hay tags disponibles sin asignar.</p>
          )}
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}

      {assigningTruckDriver && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="size-4 text-emerald-500" />
                Asignar Camión a: {assigningTruckDriver.nombre} {assigningTruckDriver.apellido}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Solo se muestran camiones sin chofer asignado</p>
            </div>
            <button onClick={() => setAssigningTruckDriver(null)}><X className="size-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {assigningTruckDriver.camion && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Truck className="size-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Camión actual: {assigningTruckDriver.camion.patente}</p>
                <p className="text-xs text-green-700">
                  {[assigningTruckDriver.camion.marca, assigningTruckDriver.camion.modelo].filter(Boolean).join(" ")}
                </p>
              </div>
              <button onClick={() => onUnassignTruck(assigningTruckDriver)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1">
                <Unlink className="size-3" />Quitar
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <select value={selectedTruckId} onChange={(e) => setSelectedTruckId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar camión...</option>
              {availableTrucks.map((truck) => (
                <option key={truck.id_camion} value={truck.id_camion}>
                  {truck.patente}{truck.marca ? ` — ${truck.marca}` : ""}
                </option>
              ))}
            </select>
            <button onClick={onAssignTruck} disabled={!selectedTruckId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <Link className="size-4" />Asignar
            </button>
          </div>
          {availableTrucks.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">No hay camiones disponibles sin asignar.</p>
          )}
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{["Nombre", "RUT", "Teléfono", "Licencia", "Tag RFID", "Camión", "Acciones"].map((h) => (
              <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Acciones" ? "text-right" : "text-left"}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((d, i) => (
              <motion.tr key={d.id_conductor} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-700">{`${d.nombre || ""}${d.apellido || ""}`.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "?"}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{d.nombre} {d.apellido}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{d.rut || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{d.telefono || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{d.licencia || "-"}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {d.tag
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CreditCard className="size-3" /><span className="font-mono">{d.tag.uid_tag}</span></span>
                    : <span className="text-xs text-gray-400">Sin tarjeta</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {d.camion
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><Truck className="size-3" />{d.camion.patente}</span>
                    : <span className="text-xs text-gray-400">Sin camión</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(d)} title="Editar" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="size-4" /></button>
                    <button onClick={() => openAssign(d)} title="Asignar tag" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Tag className="size-4" /></button>
                    <button onClick={() => openAssignTruck(d)} title="Asignar camión" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Truck className="size-4" /></button>
                    <button onClick={() => onDelete(d.id_conductor)} title="Eliminar" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Sin conductores registrados</div>}
      </div>
    </div>
  );
}

// ── Camiones ───────────────────────────────────────────────────────────────
function TrucksTab({ searchTerm }) {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [assigningDriver, setAssigningDriver] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [form, setForm] = useState({ patente: "", id_empresa: 1, marca: "", modelo: "", color: "" });
  const [status, setStatus] = useState("");

  const load = () => {
    getCamiones().then((r) => setTrucks(r.data || r || [])).catch(() => undefined);
    getConductores().then((r) => setDrivers(r.data || r || [])).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTruck(null); setForm({ patente: "", id_empresa: 1, marca: "", modelo: "", color: "" }); setShowForm(true); setAssigningDriver(null); setStatus(""); };
  const openEdit = (t) => { setEditTruck(t); setForm({ patente: t.patente || "", id_empresa: t.id_empresa || 1, marca: t.marca || "", modelo: t.modelo || "", color: t.color || "" }); setShowForm(true); setAssigningDriver(null); setStatus(""); };
  const openAssignDriver = (truck) => { setAssigningDriver(truck); setSelectedDriverId(truck.conductor?.id_conductor || truck.id_conductor || ""); setShowForm(false); setStatus(""); };
  const cancel = () => { setShowForm(false); setEditTruck(null); setAssigningDriver(null); setStatus(""); };

  const onSave = async () => {
    try {
      if (editTruck) {
        await updateCamion(editTruck.id_camion, { marca: form.marca, modelo: form.modelo, color: form.color });
      } else {
        await createCamion({ ...form, id_empresa: Number(form.id_empresa) || 1 });
      }
      cancel();
      load();
    } catch (error) { setStatus(getErrorMessage(error, "Error al guardar camión")); }
  };

  const onDelete = async (id) => {
    try { await deleteCamion(id); load(); } catch (error) { setStatus(getErrorMessage(error, "Error al eliminar")); }
  };

  const onAssignDriver = async () => {
    if (!assigningDriver || !selectedDriverId) return;
    try {
      await asignarConductorACamion(assigningDriver.id_camion, selectedDriverId);
      setStatus("Chofer asignado correctamente");
      setAssigningDriver(null);
      load();
    } catch (error) {
      setStatus(getErrorMessage(error, "Error al asignar chofer"));
    }
  };

  const onUnassignDriver = async (truck) => {
    try {
      await desasignarConductorDeCamion(truck.id_camion);
      load();
    } catch (error) {
      setStatus(getErrorMessage(error, "Error al desasignar chofer"));
    }
  };

  const availableDrivers = drivers.filter(
    (driver) =>
      !driver.id_camion ||
      (assigningDriver && driver.id_camion === assigningDriver.id_camion) ||
      (assigningDriver && driver.id_conductor === assigningDriver.conductor?.id_conductor)
  );

  const filtered = trucks.filter(
    (t) => !searchTerm || t.patente?.toLowerCase().includes(searchTerm.toLowerCase()) || t.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={showForm ? cancel : openCreate} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {showForm ? <><X className="size-4" />Cancelar</> : <><Plus className="size-4" />Nuevo Camión</>}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editTruck ? "Editar Camión" : "Nuevo Camión"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "patente", placeholder: "Patente", disabled: !!editTruck },
              { key: "marca", placeholder: "Marca" },
              { key: "modelo", placeholder: "Modelo" },
              { key: "color", placeholder: "Color" },
            ].map(({ key, placeholder, disabled }) => (
              <input key={key} type="text" placeholder={placeholder} disabled={disabled} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400" />
            ))}
            {!editTruck && (
              <input type="number" placeholder="ID Empresa" value={form.id_empresa} onChange={(e) => setForm({ ...form, id_empresa: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Save className="size-4" />{editTruck ? "Actualizar" : "Registrar"}
            </button>
          </div>
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{["Patente", "Marca", "Modelo", "Color", "Chofer", "Estado", "Acciones"].map((h) => (
              <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Acciones" ? "text-right" : "text-left"}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((t, i) => (
              <motion.tr key={t.id_camion} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><Truck className="size-4 text-blue-600" /></div>
                    <span className="text-sm font-semibold text-gray-900">{t.patente}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.marca || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.modelo || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.color || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {t.conductor
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><Users className="size-3" />{t.conductor.nombre} {t.conductor.apellido}</span>
                    : <span className="text-xs text-gray-400">Sin chofer</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${t.estado === "activo" || t.estado == null ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {t.estado === "activo" || t.estado == null ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                    {t.estado || "activo"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="size-4" /></button>
                    <button onClick={() => openAssignDriver(t)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Users className="size-4" /></button>
                    <button onClick={() => onDelete(t.id_camion)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Sin camiones registrados</div>}
      </div>

      {assigningDriver && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="size-4 text-emerald-500" />
                Asignar Chofer al Camión: <span className="font-mono text-emerald-700">{assigningDriver.patente}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Solo se muestran choferes sin camión asignado</p>
            </div>
            <button onClick={() => setAssigningDriver(null)}><X className="size-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {assigningDriver.conductor && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Users className="size-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Chofer actual: {assigningDriver.conductor.nombre} {assigningDriver.conductor.apellido}
                </p>
                <p className="text-xs text-green-700">{assigningDriver.conductor.rut}</p>
              </div>
              <button onClick={() => onUnassignDriver(assigningDriver)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1">
                <Unlink className="size-3" />Quitar
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar chofer...</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id_conductor} value={driver.id_conductor}>
                  {driver.nombre} {driver.apellido}{driver.rut ? ` — ${driver.rut}` : ""}
                </option>
              ))}
            </select>
            <button onClick={onAssignDriver} disabled={!selectedDriverId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <Link className="size-4" />Asignar
            </button>
          </div>
          {availableDrivers.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">No hay choferes disponibles sin asignar.</p>
          )}
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}
    </div>
  );
}

// ── RFID Tags ──────────────────────────────────────────────────────────────
function RfidTab({ searchTerm }) {
  const [tags, setTags] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [editTag, setEditTag] = useState(null);
  const [assigningTag, setAssigningTag] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [tagForm, setTagForm] = useState({ codigo_interno: "", estado: "activo" });
  const [status, setStatus] = useState("");

  const load = () => {
    getTags().then((r) => setTags(r.data || r || [])).catch(() => undefined);
    getConductores().then((r) => setDrivers(r.data || r || [])).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);

  const openEditTag = (tag) => { setEditTag(tag); setTagForm({ codigo_interno: tag.codigo_interno || "", estado: tag.estado || "activo" }); setAssigningTag(null); };
  const openAssign = (tag) => { setAssigningTag(tag); setSelectedDriverId(""); setEditTag(null); setStatus(""); };

  const onUpdateTag = async () => {
    if (!editTag) return;
    try { await updateTag(editTag.id_tag, tagForm); setEditTag(null); load(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al actualizar tag")); }
  };

  const onDeleteTag = async (id) => {
    try { await deleteTag(id); load(); } catch (error) { setStatus(getErrorMessage(error, "Error al eliminar tag")); }
  };

  const onAssignDriver = async () => {
    if (!assigningTag || !selectedDriverId) return;
    try {
      await asignarConductorATag(assigningTag.id_tag, selectedDriverId);
      setStatus("Conductor asignado correctamente");
      setAssigningTag(null);
      load();
    } catch (e) {
      setStatus(getErrorMessage(e, "Error al asignar conductor"));
    }
  };

  const onUnassign = async (tag) => {
    try { await desasignarConductorDeTag(tag.id_tag); load(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al desasignar")); }
  };

  // Conductors with no tag, or the one already assigned to this tag
  const availableDrivers = drivers.filter(
    (d) => !d.tag || (assigningTag && d.id_conductor === assigningTag.id_conductor)
  );

  const filtered = tags.filter(
    (t) => !searchTerm || t.uid_tag?.toLowerCase().includes(searchTerm.toLowerCase()) || t.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {editTag && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Editar Tag: {editTag.uid_tag}</h3>
            <button onClick={() => setEditTag(null)}><X className="size-4 text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="flex gap-4">
            <input type="text" placeholder="Código interno" value={tagForm.codigo_interno} onChange={(e) => setTagForm({ ...tagForm, codigo_interno: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={tagForm.estado} onChange={(e) => setTagForm({ ...tagForm, estado: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
              <option value="bloqueado">bloqueado</option>
              <option value="perdido">perdido</option>
            </select>
            <button onClick={onUpdateTag} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Save className="size-4" />Guardar
            </button>
          </div>
        </motion.div>
      )}

      {assigningTag && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="size-4 text-purple-500" />
                Asignar Conductor al Tag: <span className="font-mono text-purple-700">{assigningTag.uid_tag}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Solo conductores sin tag asignado</p>
            </div>
            <button onClick={() => setAssigningTag(null)}><X className="size-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {assigningTag.conductor && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Users className="size-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Conductor actual: {assigningTag.conductor.nombre} {assigningTag.conductor.apellido}</p>
                <p className="text-xs text-green-700">{assigningTag.conductor.rut}</p>
              </div>
              <button onClick={() => onUnassign(assigningTag)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1">
                <Unlink className="size-3" />Quitar
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar conductor...</option>
              {availableDrivers.map((d) => (
                <option key={d.id_conductor} value={d.id_conductor}>{d.nombre} {d.apellido} — {d.rut}</option>
              ))}
            </select>
            <button onClick={onAssignDriver} disabled={!selectedDriverId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <Link className="size-4" />Asignar
            </button>
          </div>
          {status && <p className="text-xs text-gray-600 mt-3">{status}</p>}
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{["Tag", "Código Interno", "Estado", "Conductor Asignado", "Fecha Alta", "Acciones"].map((h) => (
              <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Acciones" ? "text-right" : "text-left"}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((tag, i) => (
              <motion.tr key={tag.id_tag} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg"><CreditCard className="size-4 text-purple-600" /></div>
                    <span className="text-sm font-mono font-medium text-gray-900">{tag.uid_tag}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tag.codigo_interno || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tag.estado === "activo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {tag.estado === "activo" ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                    {tag.estado || "-"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {tag.conductor
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Users className="size-3" />{tag.conductor.nombre} {tag.conductor.apellido}</span>
                    : <span className="text-xs text-gray-400">Sin conductor</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-gray-400" />
                    {tag.fecha_alta ? new Date(tag.fecha_alta).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEditTag(tag)} title="Editar" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="size-4" /></button>
                    <button onClick={() => openAssign(tag)} title="Asignar conductor" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Users className="size-4" /></button>
                    <button onClick={() => onDeleteTag(tag.id_tag)} title="Eliminar" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Sin tags RFID registrados</div>}
      </div>
    </div>
  );
}

// ── Tipos de Punto (mini-CRUD inside PuntosControl tab) ────────────────────
function TiposPuntoSection() {
  const [tipos, setTipos] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [editTipo, setEditTipo] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [status, setStatus] = useState("");

  const load = () => getTiposPuntoControl().then((r) => setTipos(r.data || r || [])).catch(() => undefined);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTipo(null); setForm({ nombre: "", descripcion: "" }); setShowCreate(true); setStatus(""); };
  const openEdit = (t) => { setEditTipo(t); setForm({ nombre: t.nombre || "", descripcion: t.descripcion || "" }); setShowCreate(true); setStatus(""); };
  const cancel = () => { setShowCreate(false); setEditTipo(null); setStatus(""); };

  const onSave = async () => {
    if (!form.nombre) return;
    try {
      if (editTipo) {
        await updateTipoPuntoControl(editTipo.id_tipo, form);
        setStatus("Tipo actualizado");
      } else {
        await createTipoPuntoControl(form);
        setStatus("Tipo creado");
      }
      cancel();
      load();
    } catch (e) {
      setStatus(getErrorMessage(e, "Error al guardar"));
    }
  };

  const onDelete = async (id) => {
    try { await deleteTipoPuntoControl(id); load(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al eliminar tipo")); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Tipos de Punto de Control</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tipos.length}</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-4 flex justify-between items-center bg-gray-50">
            <p className="text-xs text-gray-500">Define los tipos disponibles al crear o editar un punto de control</p>
            <button onClick={showCreate ? cancel : openCreate} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${showCreate ? "bg-gray-200 text-gray-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {showCreate ? <><X className="size-3.5" />Cancelar</> : <><Plus className="size-3.5" />Nuevo Tipo</>}
            </button>
          </div>

          {showCreate && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex gap-3">
                <input type="text" placeholder="Nombre del tipo (ej: zona_carga)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                <input type="text" placeholder="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                <button onClick={onSave} disabled={!form.nombre} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  <Save className="size-4" />{editTipo ? "Actualizar" : "Crear"}
                </button>
              </div>
              {status && <p className="text-xs text-gray-600 mt-2">{status}</p>}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {tipos.map((tipo) => (
              <div key={tipo.id_tipo} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 font-mono">{tipo.nombre}</span>
                  {tipo.descripcion && <span className="ml-3 text-xs text-gray-500">{tipo.descripcion}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(tipo)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit className="size-3.5" /></button>
                  <button onClick={() => onDelete(tipo.id_tipo)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            ))}
            {tipos.length === 0 && <div className="p-4 text-center text-sm text-gray-400">Sin tipos registrados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Puntos de Control ──────────────────────────────────────────────────────
const emptyPcForm = { nombre: "", ubicacion: "", id_zona: "", tipo_punto: "", id_esp32: "", coords: null, activo: true };

function PuntosControlTab({ searchTerm }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [mode, setMode] = useState("view");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyPcForm);
  const [status, setStatus] = useState("");

  const load = () => {
    getPuntosControl().then((r) => setCheckpoints(r.data || r || [])).catch(() => undefined);
    getTiposPuntoControl().then((r) => setTipos(r.data || r || [])).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...emptyPcForm, tipo_punto: tipos[0]?.nombre || "checkpoint", activo: true }); setSelectedId(null); setMode("create"); setStatus(""); };
  const openEdit = (cp) => {
    setForm({ nombre: cp.nombre || "", ubicacion: cp.ubicacion || "", id_zona: cp.id_zona || "", tipo_punto: cp.tipo_punto || "checkpoint", id_esp32: cp.id_esp32 || "", coords: parseCoords(cp.cordenadas), activo: cp.activo !== false });
    setSelectedId(cp.id_punto_control);
    setMode("edit");
    setStatus("");
  };
  const cancel = () => { setMode("view"); setForm(emptyPcForm); setSelectedId(null); setStatus(""); };

  const handleMapClick = (pos) => {
    if (mode === "create" || mode === "edit") setForm((f) => ({ ...f, coords: pos }));
  };

  const onSave = async () => {
    if (!form.nombre || !form.id_esp32) return;
    const payload = { nombre: form.nombre, ubicacion: form.ubicacion || null, cordenadas: coordsToString(form.coords) || null, id_zona: form.id_zona || null, tipo_punto: form.tipo_punto, id_esp32: form.id_esp32, activo: form.activo };
    try {
      if (mode === "create") { await createPuntoControl(payload); setStatus("Punto creado"); }
      else { await updatePuntoControl(selectedId, payload); setStatus("Punto actualizado"); }
      cancel();
      load();
    } catch (error) { setStatus(getErrorMessage(error, "Error al guardar")); }
  };

  const onDelete = async (id) => {
    try { await deletePuntoControl(id); load(); if (selectedId === id) cancel(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al eliminar")); }
  };

  const filtered = checkpoints.filter(
    (cp) => !searchTerm || cp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || cp.id_zona?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mapMarkers = [
    ...checkpoints.filter((cp) => parseCoords(cp.cordenadas)).map((cp) => ({
      id: cp.id_punto_control,
      position: parseCoords(cp.cordenadas),
      label: cp.nombre || cp.id_punto_control,
      title: `${cp.nombre || cp.id_punto_control}${cp.ubicacion ? ` · ${cp.ubicacion}` : ""}`,
      onClick: () => {
        if (mode === "view") setSelectedId(cp.id_punto_control);
      },
    })),
    ...(form.coords && mode !== "view" ? [{ id: "__draft__", position: form.coords, label: form.nombre || "Nuevo", icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }] : []),
  ];

  const routeSegments = [];

  const validCps = checkpoints.filter((cp) => parseCoords(cp.cordenadas));
  const center = (validCps[0] && parseCoords(validCps[0].cordenadas)) || { lat: -33.4372, lng: -70.6506 };
  const selectedCheckpoint = checkpoints.find((cp) => cp.id_punto_control === selectedId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Mapa de Puntos de Control</h2>
              <p className="text-xs text-gray-500 mt-0.5">{mode !== "view" ? "Haz clic en el mapa para colocar coordenadas" : `${checkpoints.length} puntos registrados`}</p>
            </div>
            <button onClick={mode !== "view" ? cancel : openCreate} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${mode !== "view" ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {mode !== "view" ? <><X className="size-3.5" />Cancelar</> : <><Plus className="size-3.5" />Nuevo</>}
            </button>
          </div>
          <div className="flex-1">
            <GoogleMapView
              key={`pc-map-${mode}-${selectedId || "none"}-${mapMarkers.length}`}
              center={center}
              zoom={12}
              markers={mapMarkers}
              routeSegments={routeSegments}
              onClick={handleMapClick}
              fitToData={mode === "view"}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 overflow-auto">
          {mode === "view" && selectedCheckpoint && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedCheckpoint.nombre || selectedCheckpoint.id_punto_control}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedCheckpoint.ubicacion || "Sin ubicación descriptiva"}</p>
                  </div>
                  <span className={`text-[11px] rounded-full px-2 py-1 ${selectedCheckpoint.activo !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {selectedCheckpoint.activo !== false ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <div className="font-medium text-gray-500 mb-1">Tipo</div>
                  <div className="text-gray-900">{selectedCheckpoint.tipo_punto || "checkpoint"}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500 mb-1">ESP32</div>
                  <div className="text-gray-900">{selectedCheckpoint.id_esp32 || "-"}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500 mb-1">Zona</div>
                  <div className="text-gray-900">{selectedCheckpoint.id_zona || "-"}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500 mb-1">Coordenadas</div>
                  <div className="font-mono text-gray-900">{selectedCheckpoint.cordenadas || "Sin coordenadas"}</div>
                </div>
              </div>
            </motion.div>
          )}

          {mode !== "view" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900">{mode === "create" ? "Nuevo Punto de Control" : "Editar Punto de Control"}</h3>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { key: "nombre", label: "Nombre", placeholder: "Ej: PC-01" },
                  { key: "id_esp32", label: "ID ESP32 *", placeholder: "Ej: ESP32-001" },
                  { key: "ubicacion", label: "Ubicación", placeholder: "Ej: Bodega A" },
                  { key: "id_zona", label: "ID Zona", placeholder: "Ej: ZONA-1" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input type="text" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.tipo_punto} onChange={(e) => setForm({ ...form, tipo_punto: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {tipos.map((t) => <option key={t.id_tipo} value={t.nombre}>{t.nombre}{t.descripcion ? ` — ${t.descripcion}` : ""}</option>)}
                    {tipos.length === 0 && <option value="checkpoint">checkpoint</option>}
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-gray-700">Activo</div>
                    <div className="text-[11px] text-gray-500">Disponible para rutas y monitoreo</div>
                  </div>
                  <button onClick={() => setForm((current) => ({ ...current, activo: !current.activo }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.activo ? "bg-blue-600" : "bg-gray-300"}`}>
                    <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Coordenadas</label>
                  {form.coords
                    ? <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">{form.coords.lat.toFixed(6)}, {form.coords.lng.toFixed(6)}</div>
                    : <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">Haz clic en el mapa para colocar</div>
                  }
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={onSave} disabled={!form.nombre || !form.id_esp32} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1">
                    <Save className="size-3.5" />Guardar
                  </button>
                  <button onClick={cancel} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors">Cancelar</button>
                </div>
                {status && <p className="text-xs text-gray-600">{status}</p>}
              </div>
            </motion.div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Puntos de Control</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
              {filtered.length === 0
                ? <div className="p-6 text-center text-sm text-gray-400">Sin puntos registrados</div>
                : filtered.map((cp) => (
                  <div key={cp.id_punto_control} onClick={() => setSelectedId(cp.id_punto_control)} className={`p-3 flex items-start justify-between gap-2 hover:bg-gray-50 cursor-pointer ${selectedId === cp.id_punto_control ? "bg-blue-50" : ""}`}>
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="size-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{cp.nombre || cp.id_punto_control}</div>
                        {cp.ubicacion && <div className="text-xs text-gray-500 truncate">{cp.ubicacion}</div>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {cp.tipo_punto && <span className="text-xs text-blue-600 font-mono">{cp.tipo_punto}</span>}
                          {cp.id_esp32 && <span className="text-xs text-gray-400">{cp.id_esp32}</span>}
                          <span className={`text-[11px] rounded-full px-2 py-0.5 ${cp.activo !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {cp.activo !== false ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(event) => { event.stopPropagation(); openEdit(cp); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit className="size-3.5" /></button>
                      <button onClick={(event) => { event.stopPropagation(); onDelete(cp.id_punto_control); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Tipos de Punto section */}
      <TiposPuntoSection />
    </div>
  );
}

// ── Rutas ──────────────────────────────────────────────────────────────────
const emptyRutaForm = { nombre: "", descripcion: "", activa: true, puntos: [] };

function RutasTab({ searchTerm }) {
  const [rutas, setRutas] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [mode, setMode] = useState("view");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyRutaForm);
  const [status, setStatus] = useState("");

  const load = () => {
    getRutas().then((r) => setRutas(r.data || r || [])).catch(() => undefined);
    getPuntosControl().then((r) => setCheckpoints(r.data || r || [])).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyRutaForm); setSelectedId(null); setMode("create"); setStatus(""); };
  const openEdit = (ruta) => {
    setForm({ nombre: ruta.nombre || "", descripcion: ruta.descripcion || "", activa: ruta.activa !== false, puntos: (ruta.puntos || []).map((p) => ({ id_punto_control: p.id_punto_control, orden: p.orden })) });
    setSelectedId(ruta.id_ruta);
    setMode("edit");
    setStatus("");
  };
  const cancel = () => { setMode("view"); setForm(emptyRutaForm); setSelectedId(null); setStatus(""); };

  const onSave = async () => {
    if (!form.nombre) return;
    const payload = { nombre: form.nombre, descripcion: form.descripcion || null, activa: form.activa, puntos: form.puntos };
    try {
      if (mode === "create") { await createRuta(payload); }
      else { await updateRuta(selectedId, payload); }
      cancel();
      load();
    } catch (error) { setStatus(getErrorMessage(error, "Error al guardar ruta")); }
  };

  const onDelete = async (id) => {
    try { await deleteRuta(id); load(); if (selectedId === id) cancel(); }
    catch (error) { setStatus(getErrorMessage(error, "Error al eliminar ruta")); }
  };

  const addPunto = (idPunto) => {
    if (form.puntos.find((p) => p.id_punto_control === idPunto)) return;
    setForm((f) => ({ ...f, puntos: [...f.puntos, { id_punto_control: idPunto, orden: f.puntos.length + 1 }] }));
  };

  const removePunto = (idPunto) => {
    setForm((f) => ({ ...f, puntos: f.puntos.filter((p) => p.id_punto_control !== idPunto).map((p, i) => ({ ...p, orden: i + 1 })) }));
  };

  const movePunto = (index, dir) => {
    setForm((f) => {
      const arr = [...f.puntos];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return f;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...f, puntos: arr.map((p, i) => ({ ...p, orden: i + 1 })) };
    });
  };

  // Map preview: only checkpoints that have coordinates AND are in form.puntos
  const formPuntosWithCoords = form.puntos
    .map((p) => ({ ...p, cp: checkpoints.find((c) => c.id_punto_control === p.id_punto_control) }))
    .filter((p) => p.cp && parseCoords(p.cp.cordenadas));

  const mapMarkers = formPuntosWithCoords.map((p) => ({
    id: p.id_punto_control,
    position: parseCoords(p.cp.cordenadas),
    label: `${p.orden}. ${p.cp.nombre || p.id_punto_control}`,
    title: `${p.orden}. ${p.cp.nombre || p.id_punto_control}`,
  }));

  const routeSegments = formPuntosWithCoords.slice(0, -1).map((p, i) => ({
    start: parseCoords(p.cp.cordenadas),
    end: parseCoords(formPuntosWithCoords[i + 1].cp.cordenadas),
    status: "pending",
  }));

  const validCps = checkpoints.filter((cp) => cp.activo !== false && parseCoords(cp.cordenadas));
  const mapCenter = (formPuntosWithCoords[0] && parseCoords(formPuntosWithCoords[0].cp.cordenadas))
    || (validCps[0] && parseCoords(validCps[0].cordenadas))
    || { lat: -33.4372, lng: -70.6506 };

  const availablePuntos = checkpoints.filter((cp) => cp.activo !== false && !form.puntos.find((p) => p.id_punto_control === cp.id_punto_control));
  const filtered = rutas.filter((r) => !searchTerm || r.nombre?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      {mode !== "view" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form panel */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-900">{mode === "create" ? "Nueva Ruta" : "Editar Ruta"}</h3>
              <button onClick={cancel}><X className="size-4 text-blue-400 hover:text-blue-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Ruta</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Ruta Norte"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Activa</label>
                <button onClick={() => setForm({ ...form, activa: !form.activa })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.activa ? "bg-blue-600" : "bg-gray-300"}`}>
                  <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${form.activa ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Puntos de Control ({form.puntos.length})</label>
                {form.puntos.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {form.puntos.map((p, i) => {
                      const cp = checkpoints.find((c) => c.id_punto_control === p.id_punto_control);
                      const hasCoords = cp && parseCoords(cp.cordenadas);
                      return (
                        <div key={p.id_punto_control} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${hasCoords ? "bg-gray-50" : "bg-amber-50 border border-amber-200"}`}>
                          <span className="text-xs font-medium text-gray-500 w-5">{p.orden}.</span>
                          <MapPin className={`size-3.5 shrink-0 ${hasCoords ? "text-blue-500" : "text-amber-500"}`} />
                          <span className="flex-1 text-sm text-gray-900 truncate">{cp?.nombre || p.id_punto_control}</span>
                          {!hasCoords && <span className="text-xs text-amber-600">sin coords</span>}
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => movePunto(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">↑</button>
                            <button onClick={() => movePunto(i, 1)} disabled={i === form.puntos.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">↓</button>
                            <button onClick={() => removePunto(p.id_punto_control)} className="p-1 text-gray-400 hover:text-red-500"><X className="size-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {availablePuntos.length > 0 && (
                  <select onChange={(e) => { if (e.target.value) { addPunto(e.target.value); e.target.value = ""; } }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">+ Agregar punto de control...</option>
                    {availablePuntos.map((cp) => (
                      <option key={cp.id_punto_control} value={cp.id_punto_control}>
                        {cp.nombre || cp.id_punto_control}{parseCoords(cp.cordenadas) ? "" : " ⚠️ sin coords"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={onSave} disabled={!form.nombre} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  <Save className="size-4" />{mode === "create" ? "Crear Ruta" : "Actualizar Ruta"}
                </button>
                <button onClick={cancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">Cancelar</button>
              </div>
              {status && <p className="text-xs text-gray-600">{status}</p>}
            </div>
          </motion.div>

          {/* Map preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Vista Previa de Ruta</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {formPuntosWithCoords.length} de {form.puntos.length} punto{form.puntos.length !== 1 ? "s" : ""} con coordenadas
              </p>
            </div>
            <div className="flex-1">
              <GoogleMapView
                key={`ruta-map-${selectedId || mode}-${form.puntos.map((p) => `${p.id_punto_control}:${p.orden}`).join("|")}`}
                center={mapCenter}
                zoom={12}
                markers={mapMarkers}
                routeSegments={routeSegments}
                fitToData
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <Plus className="size-4" />Nueva Ruta
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{["Nombre", "Descripción", "Puntos", "Estado", "Acciones"].map((h) => (
              <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Acciones" ? "text-right" : "text-left"}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((ruta, i) => (
              <motion.tr key={ruta.id_ruta} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg"><Route className="size-4 text-green-600" /></div>
                    <span className="text-sm font-semibold text-gray-900">{ruta.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{ruta.descripcion || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(ruta.puntos || []).length} puntos</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ruta.activa !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {ruta.activa !== false ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                    {ruta.activa !== false ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(ruta)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="size-4" /></button>
                    <button onClick={() => onDelete(ruta.id_ruta)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Sin rutas registradas</div>}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function DataManagementPage() {
  const [activeTab, setActiveTab] = useState("drivers");
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "drivers", label: "Conductores", icon: Users },
    { id: "trucks", label: "Camiones", icon: Truck },
    { id: "rfid", label: "Tags RFID", icon: CreditCard },
    { id: "checkpoints", label: "Puntos de Control", icon: MapPin },
    { id: "routes", label: "Rutas", icon: Route },
  ];

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestión de Datos Operativos</h1>
        <p className="text-sm text-gray-500 mt-1">Administra conductores, camiones, tags RFID, puntos de control y rutas</p>
      </header>

      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(""); }}
                className={`relative px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
                <div className="flex items-center gap-2"><Icon className="size-4" /><span>{tab.label}</span></div>
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex-1 px-8 py-6 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === "drivers" && (
            <motion.div key="drivers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <DriversTab searchTerm={searchTerm} />
            </motion.div>
          )}
          {activeTab === "trucks" && (
            <motion.div key="trucks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <TrucksTab searchTerm={searchTerm} />
            </motion.div>
          )}
          {activeTab === "rfid" && (
            <motion.div key="rfid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <RfidTab searchTerm={searchTerm} />
            </motion.div>
          )}
          {activeTab === "checkpoints" && (
            <motion.div key="checkpoints" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <PuntosControlTab searchTerm={searchTerm} />
            </motion.div>
          )}
          {activeTab === "routes" && (
            <motion.div key="routes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <RutasTab searchTerm={searchTerm} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
