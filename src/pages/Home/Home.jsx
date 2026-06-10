import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import './Home.css';

/* ── SVG Icons ── */
const Icons = {
  Expense: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

export default function Home() {
  const { profile, session, isAdmin } = useAuth();

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch de Estadísticas Diarias
  const { data: stats = { expenses: 0, packages: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats', session?.user?.id],
    queryFn: async () => {
      const todayStr = getTodayStr();

      // ── Consultas preparadas ──
      let expQuery = supabase.from('expenses').select('amount').eq('date', todayStr);
      if (!isAdmin) {
        expQuery = expQuery.eq('user_id', session.user.id);
      }

      let delQuery = supabase.from('deliveries').select('packages').eq('date', todayStr);
      if (!isAdmin) {
        delQuery = delQuery.eq('user_id', session.user.id);
      }

      // Ejecutar en paralelo (async-parallel)
      const [expRes, delRes] = await Promise.all([expQuery, delQuery]);
      if (expRes.error) throw expRes.error;
      if (delRes.error) throw delRes.error;

      const sumExpenses = expRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const sumPackages = delRes.data?.reduce((acc, curr) => acc + Number(curr.packages), 0) || 0;

      return { expenses: sumExpenses, packages: sumPackages };
    },
    enabled: !!session?.user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // refresco silencioso cada minuto
  });

  // Fetch de Flota Global del Equipo — live para todos los usuarios
  const { data: fleetStatus = [], isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet', 'all', 'team', session?.user?.id],
    queryFn: async () => {
      const todayStr = getTodayStr();

      // Ejecutar consultas de flota en paralelo (async-parallel)
      const [delRes, vansRes, profilesRes] = await Promise.all([
        supabase.from('deliveries').select('id, van_id, user_id').eq('date', todayStr),
        supabase.from('vans').select('*').eq('is_active', true).order('label'),
        supabase.from('profiles').select('id, name')
      ]);

      if (delRes.error) throw delRes.error;
      if (vansRes.error) throw vansRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const delData = delRes.data;
      const vansData = vansRes.data;
      const profilesData = profilesRes.data;

      const pMap = {};
      profilesData?.forEach(p => { pMap[p.id] = p.name; });

      return (vansData || []).map(v => {
        const activeDelivery = delData?.find(d => d.van_id === v.id);
        return {
          van: v,
          driverId: activeDelivery?.user_id || null,
          driver: activeDelivery ? (pMap[activeDelivery.user_id] || 'Trabajador') : null,
        };
      });
    },
    enabled: !!session?.user?.id,
    staleTime: 0,                   // siempre considerado stale → refetch al volver al tab
    refetchOnWindowFocus: true,     // recarga al volver a la pestaña
    refetchInterval: 30_000,        // polling silencioso cada 30 segundos
  });

  const loading = statsLoading || fleetLoading;

  return (
    <div className="page">
      <div className="page__header">
        <p className="page__subtitle" style={{ marginBottom: '4px' }}>
          {today}
        </p>
        <h1 className="page__title">
          ¡Hola, {profile?.name || 'Usuario'}!
        </h1>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card__row">
          <span className="card__label">Tu Rol</span>
          <span className={`badge badge--${isAdmin ? 'admin' : 'worker'}`}>
            {isAdmin ? 'Admin' : 'Trabajador'}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* ── Dashboard Stats ── */}
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <span className="dashboard-card__icon" style={{ color: 'var(--color-danger)' }}>{Icons.Expense}</span>
                <span className="dashboard-card__title">Gastos de Hoy</span>
              </div>
              <div className="dashboard-card__value">
                {stats.expenses.toFixed(2)} €
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <span className="dashboard-card__icon" style={{ color: 'var(--color-accent)' }}>{Icons.Package}</span>
                <span className="dashboard-card__title">Paquetes Hoy</span>
              </div>
              <div className="dashboard-card__value">
                {stats.packages}
              </div>
            </div>
          </div>

          {/* ── Fleet Section (visible para todos) ── */}
          <div className="fleet-section">
            <h2 className="fleet-section__title">Flota de Hoy</h2>
            {fleetStatus.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No hay furgonetas activas creadas en el sistema.</p>
            ) : (
              <div className="fleet-list">
                {fleetStatus.map(({ van, driver, driverId }) => {
                  const isMyVan = driverId === session?.user?.id;
                  return (
                    <div
                      key={van.id}
                      className={`fleet-item${isMyVan ? ' fleet-item--mine' : ''}`}
                      style={isMyVan ? { borderLeft: `4px solid ${van.color}` } : {}}
                    >
                      <div className="fleet-item__van">
                        <span
                          className="fleet-item__color"
                          style={{ backgroundColor: van.color }}
                        />
                        <span>{van.label}</span>
                        {isMyVan && (
                          <span className="fleet-item__mine-badge">Tu vehículo</span>
                        )}
                      </div>
                      <div className="fleet-item__driver">
                        {driver ? (
                          <span className="fleet-item__driver--active">🟠 En ruta ({driver})</span>
                        ) : (
                          <span className="fleet-item__driver--empty">🟢 Disponible</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isAdmin && !fleetStatus.some(f => f.driverId === session?.user?.id) && (
              <div className="card" style={{ marginTop: 'var(--space-sm)', borderLeft: '3px solid var(--color-warning)', padding: 'var(--space-md)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  ⚠️ No tienes ningún vehículo asignado hoy. Inicia una ruta en la pestaña Entregas para comenzar tu jornada.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
