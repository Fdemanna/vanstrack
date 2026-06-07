import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Profile() {
  const { profile, session, signOut, isAdmin, updateProfileName } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setLoggingOut(false);
    }
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('El nombre no puede estar vacío');
      return;
    }
    setErrorMsg(null);
    setUpdatingName(true);
    try {
      await updateProfileName(nameInput.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating name:', err);
      setErrorMsg(err.message || 'Error al actualizar el nombre');
    } finally {
      setUpdatingName(false);
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Mi Perfil</h1>
      </div>

      <div className="profile-card">
        <div className="profile-card__header">
          <div className="profile-card__avatar">
            {getInitials(profile?.name)}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSaveName} className="profile-card__edit-form">
              <input
                type="text"
                className="form-input profile-card__edit-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                disabled={updatingName}
                autoFocus
                placeholder="Nombre completo"
                required
              />
              <div className="profile-card__edit-actions">
                <button
                  type="submit"
                  className="btn btn--primary btn--icon-only"
                  disabled={updatingName}
                  title="Guardar"
                  style={{ width: '38px', height: '38px', padding: 0 }}
                >
                  {updatingName ? (
                    <span className="spinner spinner--sm" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon-only"
                  onClick={() => {
                    setIsEditing(false);
                    setErrorMsg(null);
                  }}
                  disabled={updatingName}
                  title="Cancelar"
                  style={{ width: '38px', height: '38px', padding: 0 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-card__name-wrapper">
              <span className="profile-card__name">
                {profile?.name || 'Sin nombre'}
              </span>
              <button
                className="profile-card__edit-btn"
                onClick={() => {
                  setNameInput(profile?.name || '');
                  setIsEditing(true);
                  setErrorMsg(null);
                }}
                title="Editar nombre"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          {errorMsg && <div className="profile-card__error">{errorMsg}</div>}

          <span className={`badge badge--${isAdmin ? 'admin' : 'worker'}`}>
            {isAdmin ? 'Administrador' : 'Trabajador'}
          </span>
        </div>

        <div className="profile-card__body">
          <div className="profile-card__row">
            <span className="profile-card__row-label">Email / Usuario</span>
            <span className="profile-card__row-value">
              {(() => {
                const email = session?.user?.email || '';
                if (email.endsWith('@local.vanstrack')) {
                  // Es un username interno — mostrar solo la parte antes del @
                  return `@${email.split('@')[0]}`;
                }
                return email || '—';
              })()}
            </span>
          </div>
          <div className="profile-card__row">
            <span className="profile-card__row-label">ID</span>
            <span
              className="profile-card__row-value"
              style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}
            >
              {profile?.id?.slice(0, 8)}…
            </span>
          </div>
          <div className="profile-card__row">
            <span className="profile-card__row-label">Cuenta creada</span>
            <span className="profile-card__row-value">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('es-ES')
                : '—'}
            </span>
          </div>
        </div>

        <div className="profile-card__actions">
          <button
            className="btn btn--danger btn--block"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <>
                <span className="spinner spinner--sm" />
                Cerrando sesión...
              </>
            ) : (
              <>
                <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Cerrar Sesión
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
