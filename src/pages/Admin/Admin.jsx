import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './Admin.css';

/* ── SVG Icons ── */
const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const UsersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const VanIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────
// Modal component (bottom sheet style)
// ─────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            {CloseIcon}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Worker Form
// ─────────────────────────────────────────────
function CreateWorkerForm({ onSubmit, onClose, loading, error }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ username, password, name, role });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="worker-name">Nombre completo</label>
        <input
          id="worker-name"
          className="form-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Juan García"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="worker-username">Usuario o Email</label>
        <input
          id="worker-username"
          className="form-input"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="ej. juan123 o juan@empresa.com"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="worker-password">Contraseña temporal</label>
        <input
          id="worker-password"
          className="form-input"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mín. 8 caracteres con letra y número"
          minLength={8}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="worker-role">Rol</label>
        <select
          id="worker-role"
          className="form-input"
          value={role}
          onChange={e => setRole(e.target.value)}
          required
        >
          <option value="worker">Trabajador</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? (
            <><span className="spinner spinner--sm" /> Creando...</>
          ) : (
            'Crear Usuario'
          )}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// Create Van Form
// ─────────────────────────────────────────────
function CreateVanForm({ onSubmit, onClose, loading, error }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#6366f1');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ label, color });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="van-label">Nombre / Matrícula</label>
        <input
          id="van-label"
          className="form-input"
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Furgoneta 01 — 1234 ABC"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="van-color">Color identificativo</label>
        <div className="color-input-wrapper">
          <input
            id="van-color"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
          <span className="color-preview">{color}</span>
        </div>
      </div>

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? (
            <><span className="spinner spinner--sm" /> Guardando...</>
          ) : (
            'Crear Furgoneta'
          )}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// Workers Tab
// ─────────────────────────────────────────────
function WorkersTab() {
  const { session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Password Reset States
  const [selectedUserToReset, setSelectedUserToReset] = useState(null);
  const [newTempPassword, setNewTempPassword] = useState('');

  const queryClient = useQueryClient();

  // Query para cargar trabajadores
  const { data: workers = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'workers', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          creator:created_by (
            id,
            name,
            role
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Mutación para Crear Trabajador
  const createWorkerMutation = useMutation({
    mutationFn: async (newWorker) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-worker`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(newWorker),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workers', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'all'] });
      setToast('Usuario creado correctamente');
      setTimeout(() => setToast(null), 3000);
      setShowModal(false);
    },
    onError: (err) => {
      // Mostrar error como toast para que no se pierda si el modal se cierra (fix M-6)
      setToast(`❌ Error: ${err.message}`);
      setTimeout(() => setToast(null), 5000);
    },
  });

  // Mutación para Resetear Contraseña
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId, password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workers', 'all'] });
      setToast('Contraseña restablecida correctamente');
      setTimeout(() => setToast(null), 3000);
      handleCloseResetModal();
    },
  });

  function handleCreateWorker(newWorkerData) {
    createWorkerMutation.mutate(newWorkerData);
  }

  function handleOpenResetModal(user) {
    setSelectedUserToReset(user);
    setNewTempPassword('');
  }

  function handleCloseResetModal() {
    setSelectedUserToReset(null);
  }

  function handleResetPasswordSubmit(e) {
    e.preventDefault();
    resetPasswordMutation.mutate({
      userId: selectedUserToReset.id,
      password: newTempPassword,
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {workers.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <h3 className="empty-state__title">Sin usuarios</h3>
          <p className="empty-state__text">Crea el primer usuario con el botón +</p>
        </div>
      ) : (
        <div className="entity-list">
          {workers.map(w => (
            <div key={w.id} className="worker-card">
              <div className="worker-card__header">
                <div className="worker-card__avatar">
                  {getInitials(w.name)}
                </div>
                <div className="worker-card__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="worker-card__name">{w.name || 'Sin nombre'}</div>
                    {w.id !== session?.user?.id && (
                      <button
                        className="btn-reset-pwd"
                        onClick={() => handleOpenResetModal(w)}
                        title="Restablecer Contraseña"
                        aria-label="Restablecer Contraseña"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="worker-card__email">
                    {w.username ? `@${w.username}` : `${w.id.slice(0, 8)}…`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`badge badge--${w.role}`}>
                    {w.role === 'admin' ? 'Admin' : 'Worker'}
                  </span>
                  {w.password_changed === false && (
                    <span className="badge badge--warning">
                      Clave Temp.
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-xs)' }}>
                <div className="worker-card__date">
                  Creado: {new Date(w.created_at).toLocaleDateString('es-ES')}
                </div>
                {w.creator && (
                  <div className="worker-card__creator">
                    Creado por: {w.creator.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowModal(true)} aria-label="Añadir usuario">
        {PlusIcon}
      </button>

      {showModal && (
        <Modal title="Nuevo Usuario" onClose={() => setShowModal(false)}>
          <CreateWorkerForm
            onSubmit={handleCreateWorker}
            onClose={() => setShowModal(false)}
            loading={createWorkerMutation.isPending}
            error={createWorkerMutation.error?.message}
          />
        </Modal>
      )}

      {selectedUserToReset && (
        <Modal title={`Nueva Contraseña — ${selectedUserToReset.name}`} onClose={handleCloseResetModal}>
          <form onSubmit={handleResetPasswordSubmit}>
            {resetPasswordMutation.error && (
              <div className="error-banner">{resetPasswordMutation.error.message}</div>
            )}
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: '1.4' }}>
              Ingresa una nueva contraseña temporal. Se forzará al usuario a cambiarla en su próximo inicio de sesión.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="new-temp-password">Contraseña Temporal</label>
              <input
                id="new-temp-password"
                className="form-input"
                type="password"
                value={newTempPassword}
                onChange={e => setNewTempPassword(e.target.value)}
                placeholder="Mín. 8 caracteres con letra y número"
                minLength={8}
                required
                disabled={resetPasswordMutation.isPending}
                autoFocus
              />
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--secondary" onClick={handleCloseResetModal} disabled={resetPasswordMutation.isPending}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary btn--danger" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? (
                  <><span className="spinner spinner--sm" /> Guardando...</>
                ) : (
                  'Restablecer'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <div className="toast toast--success">{toast}</div>}
    </>
  );
}

// ─────────────────────────────────────────────
// Vans Tab
// ─────────────────────────────────────────────
function VansTab() {
  const { session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const queryClient = useQueryClient();

  // Query para cargar furgonetas
  const { data: vans = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'vans', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Mutación para Crear Furgoneta
  const createVanMutation = useMutation({
    mutationFn: async (newVan) => {
      const { data, error } = await supabase
        .from('vans')
        .insert(newVan)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vans', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['vans', 'active'] });
      setToast('Furgoneta creada correctamente');
      setTimeout(() => setToast(null), 3000);
      setShowModal(false);
    },
  });

  // Mutación para Activar/Desactivar Furgoneta (Optimistic UI)
  const toggleVanActiveMutation = useMutation({
    mutationFn: async (van) => {
      const { error } = await supabase
        .from('vans')
        .update({ is_active: !van.is_active })
        .eq('id', van.id);
      if (error) throw error;
      return van;
    },
    onMutate: async (van) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'vans', 'all'] });
      const previousVans = queryClient.getQueryData(['admin', 'vans', 'all']) || [];

      // Actualizar optimistamente la furgoneta
      queryClient.setQueryData(
        ['admin', 'vans', 'all'],
        previousVans.map(v => v.id === van.id ? { ...v, is_active: !v.is_active } : v)
      );

      return { previousVans };
    },
    onError: (err, van, context) => {
      if (context?.previousVans) {
        queryClient.setQueryData(['admin', 'vans', 'all'], context.previousVans);
      }
      setToast(`Error: ${err.message}`);
      setTimeout(() => setToast(null), 3500);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vans', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['vans', 'active'] });
    },
  });

  function handleCreateVan(newVanData) {
    createVanMutation.mutate(newVanData);
  }

  function handleToggleVanActive(van) {
    // B-4: pedir confirmación antes de desactivar para evitar quitar una van en uso
    if (van.is_active) {
      const ok = window.confirm(
        `¿Desactivar "${van.label}"?\nSi hay un conductor usándola hoy, desaparecerá del selector de entregas.`
      );
      if (!ok) return;
    }
    toggleVanActiveMutation.mutate(van);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {vans.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <h3 className="empty-state__title">Sin furgonetas</h3>
          <p className="empty-state__text">Crea la primera furgoneta con el botón +</p>
        </div>
      ) : (
        <div className="entity-list">
          {vans.map(v => (
            <div key={v.id} className="van-card">
              <div className="van-card__header">
                <div
                  className="van-card__color-dot"
                  style={{ backgroundColor: v.color }}
                />
                <span className="van-card__label">{v.label}</span>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleToggleVanActive(v)}
                >
                  <span className={`van-card__status van-card__status--${v.is_active ? 'active' : 'inactive'}`}>
                    {v.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowModal(true)} aria-label="Añadir furgoneta">
        {PlusIcon}
      </button>

      {showModal && (
        <Modal title="Nueva Furgoneta" onClose={() => setShowModal(false)}>
          <CreateVanForm
            onSubmit={handleCreateVan}
            onClose={() => setShowModal(false)}
            loading={createVanMutation.isPending}
            error={createVanMutation.error?.message}
          />
        </Modal>
      )}

      {toast && <div className="toast toast--success">{toast}</div>}
    </>
  );
}

// ─────────────────────────────────────────────
// Admin Page (main export)
// ─────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('workers');

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Panel de Administración</h1>
        <p className="page__subtitle">Gestiona tu equipo y flota</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tabs__btn ${tab === 'workers' ? 'admin-tabs__btn--active' : ''}`}
          onClick={() => setTab('workers')}
        >
          <span className="admin-tabs__icon">{UsersIcon}</span>
          Trabajadores
        </button>
        <button
          className={`admin-tabs__btn ${tab === 'vans' ? 'admin-tabs__btn--active' : ''}`}
          onClick={() => setTab('vans')}
        >
          <span className="admin-tabs__icon">{VanIcon}</span>
          Furgonetas
        </button>
      </div>

      {tab === 'workers' && <WorkersTab />}
      {tab === 'vans' && <VansTab />}
    </div>
  );
}
