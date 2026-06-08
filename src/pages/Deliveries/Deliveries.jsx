import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './Deliveries.css';

/* ── Helpers ── */
function formatDate(date) {
  // Usar fecha LOCAL para evitar desfase de zona horaria (UTC vs local)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatMonth(date) {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

/* ── SVG Icons ── */
const Icons = {
  ChevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Route: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  CloudSync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sync-icon" aria-label="Sincronización pendiente">
      <path d="M12 13v4M10 15l2 2 2-2" />
      <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.04-1.24.12A5.5 5.5 0 0 0 5 13.5a3.5 3.5 0 0 0 3.5 3.5h9" />
    </svg>
  ),
};

/* ── Modal ── */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            {Icons.Close}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Create Delivery Form ── */
function CreateDeliveryForm({ vans, takenVanIds = new Set(), onSubmit, onClose }) {
  const [vanId, setVanId] = useState('');
  const [packages, setPackages] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));

  const selectedIsTaken = vanId && takenVanIds.has(vanId);

  function handleSubmit(e) {
    e.preventDefault();
    if (selectedIsTaken) return; // segunda barrera
    onSubmit({
      vanId,
      packages: parseInt(packages) || 0,
      kilometers: parseInt(kilometers) || 0,
      notes,
      date,
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="delivery-van">Furgoneta asignada</label>
        <select
          id="delivery-van"
          className="form-input"
          value={vanId}
          onChange={e => setVanId(e.target.value)}
          required
        >
          <option value="">Seleccionar furgoneta</option>
          {vans.map(v => {
            const isTaken = takenVanIds.has(v.id);
            return (
              <option key={v.id} value={v.id} disabled={isTaken}>
                {v.label}{isTaken ? ' — 🔴 En uso' : ''}
              </option>
            );
          })}
        </select>
        {selectedIsTaken && (
          <p className="form-hint form-hint--error">
            🚫 Esta furgoneta ya está siendo usada por otro conductor hoy.
          </p>
        )}
      </div>

      <div className="delivery-detail__grid">
        <div className="form-group">
          <label className="form-label" htmlFor="delivery-packages">Paquetes origen</label>
          <input
            id="delivery-packages"
            className="form-input"
            type="number"
            inputMode="numeric"
            min="0"
            value={packages}
            onChange={e => setPackages(e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="delivery-kilometers">Kilómetros iniciales</label>
          <input
            id="delivery-kilometers"
            className="form-input"
            type="number"
            inputMode="numeric"
            min="0"
            value={kilometers}
            onChange={e => setKilometers(e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="delivery-date">Fecha</label>
        <input
          id="delivery-date"
          className="form-input"
          type="date"
          value={date}
          max={formatDate(new Date())}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="delivery-notes">Notas adicionales (opcional)</label>
        <textarea
          id="delivery-notes"
          className="form-input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Incidencias, zona de reparto..."
          rows="3"
        />
      </div>

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={selectedIsTaken}>
          Iniciar Ruta
        </button>
      </div>
    </form>
  );
}

/* ── Delivery Detail Modal ── */
function DeliveryDetailModal({ delivery, van, workerName, onClose }) {
  const isPending = delivery.syncPending === true;
  return (
    <Modal title={`Ruta del ${formatDateDisplay(delivery.date)}`} onClose={onClose}>
      
      {workerName && (
        <div style={{ fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Trabajador:</strong> {workerName}
        </div>
      )}

      {van && (
        <div className="delivery-card__van-badge" style={{ marginBottom: 'var(--space-lg)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="delivery-card__van-dot" style={{ backgroundColor: van.color }} />
          {van.label}
        </div>
      )}

      {isPending && (
        <div className="delivery-detail__pending-banner" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed var(--color-warning)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)', fontSize: '0.8125rem', fontWeight: '500' }}>
          {Icons.CloudSync}
          <span>Pendiente de sincronizar con la nube (creado offline)</span>
        </div>
      )}

      <div className="delivery-detail__section" style={{ marginBottom: 0 }}>
        <div className="delivery-detail__section-title">Resumen</div>
        <div className="delivery-detail__grid">
          <div className="delivery-detail__stat-card">
            <div className="delivery-detail__stat-value">{delivery.packages}</div>
            <div className="delivery-detail__stat-label">Paquetes</div>
          </div>
          <div className="delivery-detail__stat-card">
            <div className="delivery-detail__stat-value">{delivery.kilometers}</div>
            <div className="delivery-detail__stat-label">Km Iniciales</div>
          </div>
        </div>
      </div>

      {delivery.notes && (
        <div className="delivery-detail__section" style={{ marginTop: 'var(--space-md)', marginBottom: 0 }}>
          <div className="delivery-detail__section-title">Notas</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', background: 'var(--bg-surface-2)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)' }}>
            {delivery.notes}
          </p>
        </div>
      )}

    </Modal>
  );
}

/* ── Main Deliveries Page ── */
export default function Deliveries() {
  const { session, isAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const queryClient = useQueryClient();
  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  // Fetch de Furgonetas
  const { data: vans = [] } = useQuery({
    queryKey: ['vans', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vans')
        .select('*')
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch de furgonetas ya ocupadas HOY por OTROS conductores
  const { data: takenVanIds = new Set() } = useQuery({
    queryKey: ['deliveries', 'taken-today'],
    queryFn: async () => {
      const todayStr = formatDate(new Date());
      const { data, error } = await supabase
        .from('deliveries')
        .select('van_id')
        .eq('date', todayStr)
        .neq('user_id', session.user.id); // Excluir la propia van del conductor
      if (error) throw error;
      return new Set((data || []).map(d => d.van_id));
    },
    enabled: !!session?.user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Detectar si el worker ya tiene una ruta registrada hoy
  const { data: workerAlreadyHasRouteToday = false } = useQuery({
    queryKey: ['deliveries', 'my-route-today', session?.user?.id],
    queryFn: async () => {
      const todayStr = formatDate(new Date());
      const { data, error } = await supabase
        .from('deliveries')
        .select('id')
        .eq('date', todayStr)
        .eq('user_id', session.user.id)
        .limit(1);
      if (error) throw error;
      return (data || []).length > 0;
    },
    enabled: !!session?.user?.id && !isAdmin,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const vanMap = {};
  vans.forEach(v => { vanMap[v.id] = v; });

  // Fetch de Perfiles (Solo para administradores)
  const { data: profiles = {} } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name');
      if (error) throw error;
      const pMap = {};
      data?.forEach(p => { pMap[p.id] = p.name; });
      return pMap;
    },
    enabled: !!isAdmin,
  });

  // Fetch de Entregas con Clave asociada al Rol/ID de Usuario
  const { data: deliveries = [], isLoading: loading } = useQuery({
    queryKey: ['deliveries', monthKey, session?.user?.id],
    queryFn: async () => {
      const { start, end } = getMonthRange(currentMonth);
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Configurar defaults de la mutación para que se puedan reanudar tras recargar la página
  if (session?.user?.id) {
    queryClient.setMutationDefaults(['createDelivery', session.user.id], {
      mutationFn: async (newDelivery) => {
        const { data, error } = await supabase
          .from('deliveries')
          .insert({
            user_id: session.user.id,
            van_id: newDelivery.vanId,
            packages: newDelivery.packages,
            kilometers: newDelivery.kilometers,
            notes: newDelivery.notes,
            date: newDelivery.date,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
    });
  }

  // Mutación para Registrar Ruta con Optimistic UI y Cola Offline
  const createDeliveryMutation = useMutation({
    mutationKey: ['createDelivery', session?.user?.id],
    retry: (failureCount, error) => {
      if (!navigator.onLine) return true;
      if (error && error.code) return false;
      return failureCount < 2;
    },
    onMutate: async (newDelivery) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries', monthKey, session.user.id] });

      const previousDeliveries = queryClient.getQueryData(['deliveries', monthKey, session.user.id]) || [];

      // Crear entrega optimista temporal
      const tempId = `temp-${Date.now()}`;
      const optimisticDelivery = {
        id: tempId,
        user_id: session.user.id,
        van_id: newDelivery.vanId,
        packages: newDelivery.packages,
        kilometers: newDelivery.kilometers,
        notes: newDelivery.notes,
        date: newDelivery.date,
        syncPending: true, // Estado para visualización offline
        created_at: new Date().toISOString(),
      };

      // Inyectar en caché
      queryClient.setQueryData(
        ['deliveries', monthKey, session.user.id],
        [optimisticDelivery, ...previousDeliveries]
      );

      return { previousDeliveries };
    },
    onError: (err, newDelivery, context) => {
      if (context?.previousDeliveries) {
        queryClient.setQueryData(
          ['deliveries', monthKey, session.user.id],
          context.previousDeliveries
        );
      }
      // Detectar violación de constraint UNIQUE (van o usuario duplicado en el mismo día)
      const is23505 = err?.code === '23505' || err?.message?.includes('23505');
      const msg = is23505
        ? 'Ya existe una ruta para esa fecha. Solo se permite una furgoneta por conductor por jornada.'
        : `Error al iniciar ruta: ${err.message}`;
      setToast({ message: msg, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries', monthKey, session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', 'taken-today'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', 'my-route-today', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['fleet', 'all', 'team'] });
    },
    onSuccess: (data) => {
      setToast({ message: 'Ruta iniciada correctamente', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      if (data) {
        setSelectedDelivery(data);
      }
    },
  });

  function prevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleCreateDelivery(newDeliveryData) {
    // Guardia 1: el worker ya tiene ruta hoy
    if (!isAdmin && workerAlreadyHasRouteToday) {
      setToast({ message: '🚫 Ya tienes una ruta registrada hoy. Solo puedes llevar una furgoneta por jornada.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    // Guardia 2: furgoneta ya ocupada por otro conductor
    if (takenVanIds.has(newDeliveryData.vanId)) {
      setToast({ message: '🚫 Esa furgoneta ya está en uso por otro conductor hoy.', type: 'error' });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    createDeliveryMutation.mutate(newDeliveryData);
  }

  const totalPackages = deliveries.reduce((sum, d) => sum + Number(d.packages), 0);

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Entregas</h1>
        <p className="page__subtitle">
          {isAdmin ? 'Rutas de la flota' : 'Tus rutas registradas'}
        </p>
      </div>

      <div className="date-nav">
        <button className="date-nav__btn" onClick={prevMonth} aria-label="Mes anterior">
          {Icons.ChevronLeft}
        </button>
        <span className="date-nav__label">
          {formatMonth(currentMonth)}
        </span>
        <button className="date-nav__btn" onClick={nextMonth} aria-label="Mes siguiente">
          {Icons.ChevronRight}
        </button>
      </div>

      {!loading && deliveries.length > 0 ? (
        <div className="summary-bar">
          <div className="summary-card">
            <div className="summary-card__value summary-card__value--count">
              {deliveries.length}
            </div>
            <div className="summary-card__label">Rutas</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__value" style={{ color: 'var(--color-accent)' }}>
              {totalPackages}
            </div>
            <div className="summary-card__label">Paquetes</div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <h3 className="empty-state__title">Sin rutas este mes</h3>
          <p className="empty-state__text">
            Inicia una nueva ruta con el botón +
          </p>
        </div>
      ) : (
        <div className="deliveries-list">
          {deliveries.map(delivery => {
            const van = vanMap[delivery.van_id];
            const workerName = profiles[delivery.user_id];
            const isPending = delivery.syncPending === true;

            return (
              <div 
                key={delivery.id} 
                className={`delivery-card ${isPending ? 'delivery-card--pending' : ''}`}
                onClick={() => setSelectedDelivery(delivery)}
              >
                {isAdmin && workerName ? (
                  <div className="delivery-card__worker">
                    {workerName}
                    {isPending ? Icons.CloudSync : null}
                  </div>
                ) : null}
                <div className="delivery-card__top">
                  {van ? (
                    <div className="delivery-card__van-badge">
                      <span className="delivery-card__van-dot" style={{ backgroundColor: van.color }} />
                      {van.label}
                    </div>
                  ) : null}
                  <span className="delivery-card__date">
                    {formatDateDisplay(delivery.date)}
                    {!isAdmin && isPending ? Icons.CloudSync : null}
                  </span>
                </div>

                <div className="delivery-card__stats">
                  <div className="delivery-card__stat">
                    {Icons.Package} <strong>{delivery.packages}</strong> <span style={{ fontSize: '0.6875rem' }}>paq</span>
                  </div>
                  <div className="delivery-card__stat">
                    {Icons.Route} <strong>{delivery.kilometers}</strong> <span style={{ fontSize: '0.6875rem' }}>km</span>
                  </div>
                </div>

                {delivery.notes ? (
                  <div className="delivery-card__notes">"{delivery.notes}"</div>
                ) : null}
                
                {isPending ? (
                  <div className="delivery-card__pending-footer">
                    Pendiente de sincronizar
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Banner informativo para workers con ruta activa hoy */}
      {!isAdmin && workerAlreadyHasRouteToday ? (
        <div className="card" style={{
          marginBottom: 'var(--space-md)',
          borderLeft: '3px solid var(--color-accent)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🟣</span>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
            Ya tienes una <strong>ruta activa hoy</strong>. Solo se permite una furgoneta por conductor por jornada.
          </p>
        </div>
      ) : null}

      {/* FAB: bloqueado para workers que ya tienen ruta hoy */}
      {!isAdmin && workerAlreadyHasRouteToday ? (
        <div className="fab fab--disabled" aria-label="Ya tienes una ruta hoy" title="Solo puedes llevar una furgoneta por jornada">
          {Icons.Plus}
        </div>
      ) : (
        <button className="fab" onClick={() => setShowCreateModal(true)} aria-label="Nueva entrega">
          {Icons.Plus}
        </button>
      )}

      {showCreateModal ? (
        <Modal title="Iniciar Ruta" onClose={() => setShowCreateModal(false)}>
          <CreateDeliveryForm
            vans={vans}
            takenVanIds={takenVanIds}
            onSubmit={handleCreateDelivery}
            onClose={() => setShowCreateModal(false)}
          />
        </Modal>
      ) : null}

      {selectedDelivery ? (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          van={vanMap[selectedDelivery.van_id]}
          workerName={profiles[selectedDelivery.user_id]}
          onClose={() => setSelectedDelivery(null)}
        />
      ) : null}

      {toast ? (
        <div className={`toast toast--${toast.type || 'success'}`}>
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
