import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import '../Login/Login.css';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-company', {
        body: { companyName, adminName, email, password }
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Error al registrar la empresa');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="login">
        <div className="login__card">
          <div className="login__logo">
            <div className="login__logo-icon">
              <img src="/logo.svg" alt="VanTrack" />
            </div>
            <span className="login__brand">VanTrack</span>
          </div>
          <h2 className="login__title" style={{ marginTop: '24px', color: 'var(--color-success-light)' }}>
            ¡Empresa Registrada!
          </h2>
          <p className="login__tagline">
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    );
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

        <p className="login__tagline">Registra tu empresa y empieza a gestionar tu flota</p>

        <h2 className="login__title">Nueva Empresa</h2>

        <form className="login__form" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="reg-company">
              Nombre de la Empresa
            </label>
            <input
              id="reg-company"
              className="form-input"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej. Logística Express"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Tu Nombre (Administrador)
            </label>
            <input
              id="reg-name"
              className="form-input"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Correo Electrónico
            </label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Contraseña
            </label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres, 1 letra y 1 número"
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
                Registrando...
              </>
            ) : (
              'Crear Empresa'
            )}
          </button>
        </form>

        <p className="login__footer">
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'underline' }}>Inicia Sesión</Link>
        </p>
      </div>
    </div>
  );
}
