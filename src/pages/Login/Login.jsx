import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { signIn } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(emailOrUsername, password);
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Usuario o contraseña incorrectos'
          : 'Error de conexión. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__logo">
          <div className="login__logo-icon">
            <img src="/logo.svg" alt="VanTrack" />
          </div>
          <span className="login__brand">VanTrack</span>
        </div>

        <p className="login__tagline">Control de entregas y gastos</p>

        <h2 className="login__title">Iniciar Sesión</h2>

        <form className="login__form" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Usuario o Email
            </label>
            <input
              id="login-email"
              className="form-input"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="ej. juan123 o tu@email.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner--sm" />
                Entrando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <p className="login__footer">
          v4.0 — VanTrack Delivery System
        </p>
      </div>
    </div>
  );
}
