import { useEffect, useState } from "react";

import {
  createCamion,
  createConductor,
  createVinculacion,
  getCamiones,
  getConductores,
  getPuntosControl,
  getTags,
  updatePuntoControl,
  updateTag,
} from "../api/operationsApi";

export function DataManagementPage() {
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [tags, setTags] = useState([]);
  const [puntosControl, setPuntosControl] = useState([]);
  const [status, setStatus] = useState("");
  const [conductorForm, setConductorForm] = useState({
    rut: "",
    nombre: "",
    apellido: "",
    telefono: "",
    licencia: "",
  });
  const [camionForm, setCamionForm] = useState({
    patente: "",
    id_empresa: 1,
    marca: "",
    modelo: "",
    color: "",
  });
  const [tagEditForm, setTagEditForm] = useState({
    id_tag: "",
    codigo_interno: "",
    estado: "activo",
  });
  const [vinculoForm, setVinculoForm] = useState({
    id_tag: "",
    id_camion: "",
    id_conductor: "",
  });
  const [puntoControlForm, setPuntoControlForm] = useState({
    id_punto_control: "",
    nombre: "",
    tipo_punto: "checkpoint",
    ubicacion: "",
    id_zona: "",
    activo: true,
  });

  const loadData = () => {
    getCamiones().then((result) => setCamiones(result.data || [])).catch(() => undefined);
    getConductores().then((result) => setConductores(result.data || [])).catch(() => undefined);
    getTags().then((result) => setTags(result.data || [])).catch(() => undefined);
    getPuntosControl().then((result) => setPuntosControl(result.data || [])).catch(() => undefined);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onCreateConductor = async () => {
    await createConductor(conductorForm);
    setStatus("Conductor registrado");
    setConductorForm({ rut: "", nombre: "", apellido: "", telefono: "", licencia: "" });
    loadData();
  };

  const onCreateCamion = async () => {
    await createCamion({ ...camionForm, id_empresa: Number(camionForm.id_empresa) || 1 });
    setStatus("Camión registrado");
    setCamionForm({ patente: "", id_empresa: 1, marca: "", modelo: "", color: "" });
    loadData();
  };

  const onUpdateTag = async () => {
    if (!tagEditForm.id_tag) {
      return;
    }
    await updateTag(tagEditForm.id_tag, {
      codigo_interno: tagEditForm.codigo_interno,
      estado: tagEditForm.estado,
    });
    setStatus("Tag RFID actualizado");
    loadData();
  };

  const onCreateVinculo = async () => {
    if (!vinculoForm.id_tag || !vinculoForm.id_camion || !vinculoForm.id_conductor) {
      return;
    }
    await createVinculacion(vinculoForm);
    setStatus("Vinculación chofer/RFID/camión creada");
    loadData();
  };

  const onSelectPuntoControl = (idPuntoControl) => {
    const punto = puntosControl.find((item) => item.id_punto_control === idPuntoControl);
    if (!punto) {
      setPuntoControlForm({
        id_punto_control: "",
        nombre: "",
        tipo_punto: "checkpoint",
        ubicacion: "",
        id_zona: "",
        activo: true,
      });
      return;
    }
    setPuntoControlForm({
      id_punto_control: punto.id_punto_control,
      nombre: punto.nombre || "",
      tipo_punto: punto.tipo_punto || "checkpoint",
      ubicacion: punto.ubicacion || "",
      id_zona: punto.id_zona || "",
      activo: punto.activo !== false,
    });
  };

  const onUpdatePuntoControl = async () => {
    if (!puntoControlForm.id_punto_control) {
      return;
    }
    await updatePuntoControl(puntoControlForm.id_punto_control, {
      nombre: puntoControlForm.nombre,
      tipo_punto: puntoControlForm.tipo_punto,
      ubicacion: puntoControlForm.ubicacion || null,
      id_zona: puntoControlForm.id_zona || null,
      activo: puntoControlForm.activo,
    });
    setStatus("Punto de control actualizado");
    loadData();
  };

  return (
    <>
      <div className="panel">
        <h3>Gestión de Datos Operativos</h3>
        {status ? <p>{status}</p> : null}
        <div className="row">
          <input
            type="text"
            placeholder="RUT conductor"
            value={conductorForm.rut}
            onChange={(event) => setConductorForm({ ...conductorForm, rut: event.target.value })}
          />
          <input
            type="text"
            placeholder="Nombre"
            value={conductorForm.nombre}
            onChange={(event) => setConductorForm({ ...conductorForm, nombre: event.target.value })}
          />
          <input
            type="text"
            placeholder="Apellido"
            value={conductorForm.apellido}
            onChange={(event) => setConductorForm({ ...conductorForm, apellido: event.target.value })}
          />
          <input
            type="text"
            placeholder="Teléfono"
            value={conductorForm.telefono}
            onChange={(event) => setConductorForm({ ...conductorForm, telefono: event.target.value })}
          />
          <input
            type="text"
            placeholder="Licencia"
            value={conductorForm.licencia}
            onChange={(event) => setConductorForm({ ...conductorForm, licencia: event.target.value })}
          />
          <button onClick={onCreateConductor}>Registrar conductor</button>
        </div>
      </div>

      <div className="panel">
        <h3>Registrar Camión</h3>
        <div className="row">
          <input
            type="text"
            placeholder="Patente"
            value={camionForm.patente}
            onChange={(event) => setCamionForm({ ...camionForm, patente: event.target.value })}
          />
          <input
            type="number"
            placeholder="ID Empresa"
            value={camionForm.id_empresa}
            onChange={(event) => setCamionForm({ ...camionForm, id_empresa: event.target.value })}
          />
          <input
            type="text"
            placeholder="Marca"
            value={camionForm.marca}
            onChange={(event) => setCamionForm({ ...camionForm, marca: event.target.value })}
          />
          <input
            type="text"
            placeholder="Modelo"
            value={camionForm.modelo}
            onChange={(event) => setCamionForm({ ...camionForm, modelo: event.target.value })}
          />
          <input
            type="text"
            placeholder="Color"
            value={camionForm.color}
            onChange={(event) => setCamionForm({ ...camionForm, color: event.target.value })}
          />
          <button onClick={onCreateCamion}>Registrar camión</button>
        </div>
      </div>

      <div className="panel">
        <h3>Editar RFID (sin UID)</h3>
        <div className="row">
          <select
            value={tagEditForm.id_tag}
            onChange={(event) => setTagEditForm({ ...tagEditForm, id_tag: event.target.value })}
          >
            <option value="">Selecciona tag</option>
            {tags.map((tag) => (
              <option key={tag.id_tag} value={tag.id_tag}>
                {tag.uid_tag}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Código interno"
            value={tagEditForm.codigo_interno}
            onChange={(event) => setTagEditForm({ ...tagEditForm, codigo_interno: event.target.value })}
          />
          <select
            value={tagEditForm.estado}
            onChange={(event) => setTagEditForm({ ...tagEditForm, estado: event.target.value })}
          >
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
            <option value="bloqueado">bloqueado</option>
            <option value="perdido">perdido</option>
          </select>
          <button onClick={onUpdateTag}>Actualizar RFID</button>
        </div>
      </div>

      <div className="panel">
        <h3>Vincular chofer / RFID / camión</h3>
        <div className="row">
          <select
            value={vinculoForm.id_conductor}
            onChange={(event) => setVinculoForm({ ...vinculoForm, id_conductor: event.target.value })}
          >
            <option value="">Conductor</option>
            {conductores.map((item) => (
              <option key={item.id_conductor} value={item.id_conductor}>
                {item.nombre} {item.apellido}
              </option>
            ))}
          </select>
          <select
            value={vinculoForm.id_camion}
            onChange={(event) => setVinculoForm({ ...vinculoForm, id_camion: event.target.value })}
          >
            <option value="">Camión</option>
            {camiones.map((item) => (
              <option key={item.id_camion} value={item.id_camion}>
                {item.patente}
              </option>
            ))}
          </select>
          <select
            value={vinculoForm.id_tag}
            onChange={(event) => setVinculoForm({ ...vinculoForm, id_tag: event.target.value })}
          >
            <option value="">RFID</option>
            {tags.map((item) => (
              <option key={item.id_tag} value={item.id_tag}>
                {item.uid_tag}
              </option>
            ))}
          </select>
          <button onClick={onCreateVinculo}>Vincular</button>
        </div>
      </div>

      <div className="panel">
        <h3>Modificar puntos de control</h3>
        <div className="row">
          <select
            value={puntoControlForm.id_punto_control}
            onChange={(event) => onSelectPuntoControl(event.target.value)}
          >
            <option value="">Selecciona punto</option>
            {puntosControl.map((item) => (
              <option key={item.id_punto_control} value={item.id_punto_control}>
                {item.nombre || item.id_esp32}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Nombre"
            value={puntoControlForm.nombre}
            onChange={(event) => setPuntoControlForm({ ...puntoControlForm, nombre: event.target.value })}
          />
          <input
            type="text"
            placeholder="Ubicación"
            value={puntoControlForm.ubicacion}
            onChange={(event) => setPuntoControlForm({ ...puntoControlForm, ubicacion: event.target.value })}
          />
          <input
            type="text"
            placeholder="ID Zona"
            value={puntoControlForm.id_zona}
            onChange={(event) => setPuntoControlForm({ ...puntoControlForm, id_zona: event.target.value })}
          />
          <select
            value={puntoControlForm.tipo_punto}
            onChange={(event) => setPuntoControlForm({ ...puntoControlForm, tipo_punto: event.target.value })}
          >
            <option value="checkpoint">checkpoint</option>
            <option value="porton_entrada">porton_entrada</option>
            <option value="porton_salida">porton_salida</option>
          </select>
          <select
            value={puntoControlForm.activo ? "true" : "false"}
            onChange={(event) => setPuntoControlForm({ ...puntoControlForm, activo: event.target.value === "true" })}
          >
            <option value="true">activo</option>
            <option value="false">inactivo</option>
          </select>
          <button onClick={onUpdatePuntoControl}>Actualizar punto</button>
        </div>
      </div>

      <div className="panel">
        <h3>Gestión Tags RFID</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Código interno</th>
              <th>Estado</th>
              <th>Fecha alta</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id_tag}>
                <td>{tag.uid_tag}</td>
                <td>{tag.codigo_interno || "-"}</td>
                <td>
                  <span className={tag.estado === "activo" ? "status success" : "status danger"}>
                    {tag.estado}
                  </span>
                </td>
                <td>{tag.fecha_alta ? new Date(tag.fecha_alta).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Camiones</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {camiones.map((camion) => (
              <tr key={camion.id_camion}>
                <td>{camion.patente}</td>
                <td>{camion.marca || "-"}</td>
                <td>{camion.modelo || "-"}</td>
                <td>{camion.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Conductores</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RUT</th>
              <th>Teléfono</th>
              <th>Licencia</th>
            </tr>
          </thead>
          <tbody>
            {conductores.map((conductor) => (
              <tr key={conductor.id_conductor}>
                <td>{conductor.nombre} {conductor.apellido}</td>
                <td>{conductor.rut}</td>
                <td>{conductor.telefono || "-"}</td>
                <td>{conductor.licencia || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  );
}
