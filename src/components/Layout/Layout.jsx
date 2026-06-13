import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

/* ── Material Symbols ── */
const Icons = {
  Home: <span className="material-symbols-outlined">home</span>,
  Delivery: <span className="material-symbols-outlined">local_shipping</span>,
  Expense: <span className="material-symbols-outlined">receipt_long</span>,
  Profile: <span className="material-symbols-outlined">account_circle</span>,
  Admin: <span className="material-symbols-outlined">admin_panel_settings</span>,
};

function getNavItems(isAdmin) {
  const items = [
    { to: '/app', icon: Icons.Home, label: 'Inicio' },
    { to: '/app/deliveries', icon: Icons.Delivery, label: 'Furgonetas' },
    { to: '/app/expenses', icon: Icons.Expense, label: 'Gastos' },
  ];

  if (isAdmin) {
    items.push({ to: '/app/admin', icon: Icons.Admin, label: 'Admin' });
  }

  items.push({ to: '/app/profile', icon: Icons.Profile, label: 'Perfil' });

  return items;
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavItems(isAdmin);

  return (
    <div className="app-layout">
      {/* ── Mobile Top App Bar ── */}
      <header className="top-app-bar md-hidden">
        <div className="top-app-bar__inner">
          <div className="top-app-bar__title">Vantrack</div>
          <button className="top-app-bar__icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">
            <img src="/logo.svg" alt="VanTrack" />
          </div>
          <span className="sidebar__brand-name">VanTrack</span>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
              }
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {getInitials(profile?.name)}
            </div>
            <div className="sidebar__user-info" onClick={() => navigate('/app/profile')}>
              <div className="sidebar__user-name">
                {profile?.name || 'Usuario'}
              </div>
              <div className="sidebar__user-role">
                {profile?.role || 'worker'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Page Content ── */}
      <main>
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) =>
              `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
            }
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
