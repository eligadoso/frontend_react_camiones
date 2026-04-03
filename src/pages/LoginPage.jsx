import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setError("");
      await login(username, password);
      navigate("/");
    } catch {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="login-shell">
      <section className="login-visual" />
      <section className="login-form-wrapper">
        <form className="login-card" onSubmit={onSubmit}>
          <h1>SyncTruck</h1>
          <label>
            Usuario
            <input
              type="text"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit">Login</button>
          <div className="login-links">
            <Link to="/login">¿Olvidaste tu contraseña?</Link>
            <Link to="/login">Crear cuenta</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
