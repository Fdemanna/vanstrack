import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './Expenses.css';

/* ── Helpers ── */
function formatDate(date) {
  // Usar fecha LOCAL para evitar desfase de zona horaria (B-3)
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
const ChevronLeft = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
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
const CloudSyncIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sync-icon" aria-label="Sincronización pendiente">
    <path d="M12 13v4M10 15l2 2 2-2" />
    <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.04-1.24.12A5.5 5.5 0 0 0 5 13.5a3.5 3.5 0 0 0 3.5 3.5h9" />
  </svg>
);

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
            {CloseIcon}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Create Expense Form ── */
function CreateExpenseForm({ vans, myActiveVanId, onSubmit, onClose }) {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [vanId, setVanId] = useState(myActiveVanId || '');
  const [date, setDate] = useState(formatDate(new Date()));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      concept,
      amount: parseFloat(amount),
      vanId,
      date,
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="expense-concept">Concepto</label>
        <input
          id="expense-concept"
          className="form-input"
          type="text"
          value={concept}
          onChange={e => setConcept(e.target.value)}
          placeholder="Gasolina, peaje, parking..."
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="expense-amount">Importe (€)</label>
        <input
          id="expense-amount"
          className="form-input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max="9999"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="expense-van">Furgoneta</label>
        <select
          id="expense-van"
          className="form-input"
          value={vanId}
          onChange={e => setVanId(e.target.value)}
          required
        >
          <option value="">Seleccionar furgoneta</option>
          {vans.map(v => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
        {myActiveVanId && vanId === myActiveVanId && (
          <p className="form-hint">🟢 Furgoneta activa de tu ruta de hoy</p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="expense-date">Fecha</label>
        <input
          id="expense-date"
          className="form-input"
          type="date"
          value={date}
          max={formatDate(new Date())}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary">
          Registrar Gasto
        </button>
      </div>
    </form>
  );
}

/* ── Main Expenses Page ── */
export default function Expenses() {
  const { session, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
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

  // Fetch de perfiles (para mostrar nombre del trabajador en gastos — solo admin) (A-5)
  const { data: profilesMap = {} } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name');
      if (error) throw error;
      const map = {};
      data?.forEach(p => { map[p.id] = p.name; });
      return map;
    },
    enabled: !!isAdmin,
  });

  // Fetch de la van activa del worker hoy (para pre-seleccionar en el form) (M-3)
  const { data: myActiveVanId = '' } = useQuery({
    queryKey: ['expenses', 'my-van-today', session?.user?.id],
    queryFn: async () => {
      const todayStr = formatDate(new Date());
      const { data, error } = await supabase
        .from('deliveries')
        .select('van_id')
        .eq('date', todayStr)
        .eq('user_id', session.user.id)
        .limit(1)
        .single();
      if (error) return '';
      return data?.van_id || '';
    },
    enabled: !!session?.user?.id && !isAdmin,
    staleTime: 60_000,
  });

  const vanMap = {};
  vans.forEach(v => { vanMap[v.id] = v; });

  // Fetch de Gastos con Clave asociada al Rol/ID de Usuario
  const { data: expenses = [], isLoading: loading } = useQuery({
    queryKey: ['expenses', monthKey, session?.user?.id],
    queryFn: async () => {
      const { start, end } = getMonthRange(currentMonth);
      const { data, error } = await supabase
        .from('expenses')
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
    queryClient.setMutationDefaults(['createExpense', session.user.id], {
      mutationFn: async (newExpense) => {
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            user_id: session.user.id,
            van_id: newExpense.vanId,
            concept: newExpense.concept,
            amount: newExpense.amount,
            date: newExpense.date,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
    });
  }

  // Mutación para Registrar Gasto con Optimistic UI y Cola Offline
  const createExpenseMutation = useMutation({
    mutationKey: ['createExpense', session?.user?.id],
    retry: (failureCount, error) => {
      // Si estamos offline, seguir intentando (pausado en cola)
      if (!navigator.onLine) return true;
      // No reintentar si el error es de base de datos / RLS (tiene propiedad code)
      if (error && error.code) return false;
      // Reintentar otros errores hasta 2 veces
      return failureCount < 2;
    },
    onMutate: async (newExpense) => {
      const queryKey = ['expenses', monthKey, session?.user?.id];
      
      await queryClient.cancelQueries({ queryKey });

      const previousExpenses = queryClient.getQueryData(queryKey) || [];

      // Crear registro optimista temporal
      const tempId = `temp-${Date.now()}`;
      const optimisticExpense = {
        id: tempId,
        user_id: session.user.id,
        van_id: newExpense.vanId,
        concept: newExpense.concept,
        amount: newExpense.amount,
        date: newExpense.date,
        syncPending: true, // Estado para reflejar visualmente la falta de sincronización
        created_at: new Date().toISOString(),
      };

      // Inyectar en caché
      queryClient.setQueryData(queryKey, [optimisticExpense, ...previousExpenses]);

      return { previousExpenses };
    },
    onError: (err, newExpense, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(
          ['expenses', monthKey, session.user.id],
          context.previousExpenses
        );
      }
      const is23505 = err?.code === '23505' || err?.message?.includes('23505');
      const msg = is23505
        ? 'Ya existe un registro duplicado. Verifica los datos e inténtalo de nuevo.'
        : `Error al registrar gasto: ${err.message}`;
      setToast({ message: msg, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', monthKey, session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', session.user.id] });
    },
    onSuccess: () => {
      setToast({ message: 'Gasto registrado correctamente', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  function prevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleCreateExpense(newExpenseData) {
    createExpenseMutation.mutate(newExpenseData);
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Gastos</h1>
        <p className="page__subtitle">
          {isAdmin ? 'Todos los gastos de la flota' : 'Tus gastos registrados'}
        </p>
      </div>

      {/* Month Navigation */}
      <div className="date-nav">
        <button className="date-nav__btn" onClick={prevMonth} aria-label="Mes anterior">
          {ChevronLeft}
        </button>
        <span className="date-nav__label">
          {formatMonth(currentMonth)}
        </span>
        <button className="date-nav__btn" onClick={nextMonth} aria-label="Mes siguiente">
          {ChevronRight}
        </button>
      </div>

      {/* Summary */}
      {!loading && expenses.length > 0 && (
        <div className="summary-bar">
          <div className="summary-card">
            <div className="summary-card__value summary-card__value--expense">
              {totalAmount.toFixed(2)} €
            </div>
            <div className="summary-card__label">Total mes</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__value summary-card__value--count">
              {expenses.length}
            </div>
            <div className="summary-card__label">Registros</div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <h3 className="empty-state__title">Sin gastos este mes</h3>
          <p className="empty-state__text">
            Registra un gasto con el botón +
          </p>
        </div>
      ) : (
        <div className="expenses-list">
          {expenses.map(expense => {
            const van = vanMap[expense.van_id];
            const isPending = expense.syncPending === true;
            const workerName = isAdmin ? profilesMap[expense.user_id] : null;
            return (
              <div 
                key={expense.id} 
                className={`expense-card ${isPending ? 'expense-card--pending' : ''}`}
              >
                {workerName && (
                  <div className="expense-card__worker">
                    {workerName}
                    {isPending && CloudSyncIcon}
                  </div>
                )}
                <div className="expense-card__top">
                  <span className="expense-card__concept">
                    {expense.concept}
                    {isPending && CloudSyncIcon}
                  </span>
                  <span className="expense-card__amount">
                    {Number(expense.amount).toFixed(2)} €
                  </span>
                </div>
                <div className="expense-card__meta">
                  <span className="expense-card__meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatDateDisplay(expense.date)}
                  </span>
                  {van && (
                    <span className="expense-card__meta-item">
                      <span
                        className="expense-card__van-dot"
                        style={{ backgroundColor: van.color }}
                      />
                      {van.label}
                    </span>
                  )}
                  {isPending && (
                    <span className="expense-card__pending-text">
                      Pendiente de sincronizar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowModal(true)} aria-label="Nuevo gasto">
        {PlusIcon}
      </button>

      {/* Create Modal */}
      {showModal && (
        <Modal title="Nuevo Gasto" onClose={() => setShowModal(false)}>
          <CreateExpenseForm
            vans={vans}
            myActiveVanId={myActiveVanId}
            onSubmit={handleCreateExpense}
            onClose={() => setShowModal(false)}
          />
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type || 'success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
