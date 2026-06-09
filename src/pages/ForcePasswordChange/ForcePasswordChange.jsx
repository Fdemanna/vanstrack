import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ForcePasswordChange.css';

export default function ForcePasswordChange() {
  const { changePassword, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // SEC-06: mínimo 8 caracteres, al menos 1 letra y 1 número
  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setError('La contraseña debe tener al menos 8 caracteres, incluyendo una letra y un número.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
    } catch (err) {
      setError(err.message || 'Ocurrió un error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      // Error silencioso — el usuario ya intentó salir
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="force-pwd">
      <div className="force-pwd__card">
        <div className="force-pwd__logo">
          <div className="force-pwd__logo-icon">
            <img src="/logo.svg" alt="VanTrack" />
          </div>
          <span className="force-pwd__brand">Actualizar Contraseña</span>
        </div>

        <p className="force-pwd__tagline">
          Por seguridad, debes establecer una contraseña propia en tu primer inicio de sesión.
        </p>

        <form className="force-pwd__form" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              Nueva Contraseña
            </label>
            <input
              id="new-password"
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres con letra y número"
              required
              disabled={loading || loggingOut}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirmar Nueva Contraseña
            </label>
            <input
              id="confirm-password"
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={loading || loggingOut}
            />
          </div>

          <div className="force-pwd__actions">
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading || loggingOut}
            >
              {loading ? (
                <>
                  <span className="spinner spinner--sm" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>

            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={handleSignOut}
              disabled={loading || loggingOut}
              style={{ marginTop: 'var(--space-xs)' }}
            >
              {loggingOut ? (
                <>
                  <span className="spinner spinner--sm" />
                  Saliendo...
                </>
              ) : (
                'Cerrar Sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
