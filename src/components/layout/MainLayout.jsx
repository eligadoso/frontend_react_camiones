import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";

export function MainLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const items = [
    { to: "/", label: "Inicio" },
    { to: "/webhook", label: "Historial" },
    { to: "/gestion-datos", label: "Gestión Tags RFID" },
    { to: "/seguimiento-rutas", label: "Seguimiento Rutas" },
    { to: "/metricas-rutas", label: "Métricas Rutas" },
    { to: "/backend", label: "Pruebas API" },
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <h1 className="app-brand">SyncTruck</h1>
        <nav className="app-nav">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="app-main">
        <div className="app-main-header">
          <h2>Panel de Monitoreo</h2>
          <div className="row">
            <span>Bienvenido, {user?.nombre || "Usuario"}</span>
            <button className="secondary" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
