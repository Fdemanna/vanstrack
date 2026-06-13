import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Landing.css';

export default function Landing() {
  const { session } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Add custom fonts for landing page
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const siblings = e.target.parentElement.querySelectorAll('.reveal');
        siblings.forEach((el, i) => { 
          if(el === e.target) setTimeout(() => el.classList.add('show'), i * 80); 
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.head.removeChild(link); // Clean up to not pollute app
      io.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="orb orb-b" aria-hidden="true"></div>
      <div className="orb orb-o" aria-hidden="true"></div>

      {/* NAV */}
      <nav id="landing-nav" className={scrolled ? 'scrolled' : ''}>
        <a href="#" className="logo">
          <img src="/logo.svg" alt="VanTrack Logo" style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '9px' }} />
          <span className="logo-name">VanTrack <span className="logo-badge">v4</span></span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Características</a></li>
          <li><a href="#how-it-works">Cómo funciona</a></li>
          <li><a href="#testimonials">Casos de éxito</a></li>
          <li><a href="#early-access">Acceso Anticipado</a></li>
        </ul>
        <div className="nav-end">
          {session ? (
            <Link to="/app" className="l-btn l-btn-primary l-btn-sm">Ir al Dashboard →</Link>
          ) : (
            <>
              <Link to="/login" className="l-btn l-btn-ghost l-btn-sm">Iniciar Sesión</Link>
              <Link to="/register" className="l-btn l-btn-primary l-btn-sm">Probar gratis →</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot"></span>App de gestión de flotas 100% Offline</span>
          <h1>Controla tu flota.<br/><span className="grad">Incluso sin señal.</span></h1>
          <p className="hero-sub">Lleva el registro exacto de tu flota: quién conduce, qué furgoneta usa, cuántos paquetes lleva y qué gastos reporta. Todo 100% offline y sincronizado automáticamente.</p>
          <div className="hero-btns">
            <Link to={session ? "/app" : "/register"} className="l-btn l-btn-primary l-btn-lg">
              Probar gratis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
            <a href="#" className="l-btn l-btn-outline l-btn-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
              </svg>
              Ver demo
            </a>
          </div>
          <div className="hero-metrics">
            <div className="metric"><span className="metric-val">500+</span><span className="metric-label">Flotas activas</span></div>
            <div className="metric"><span className="metric-val">2M+</span><span className="metric-label">Jornadas registradas</span></div>
            <div className="metric"><span className="metric-val">99.9%</span><span className="metric-label">Disponibilidad</span></div>
          </div>
        </div>

        {/* DUAL PHONE MOCKUP */}
        <div className="hero-visual">
          <div className="fc fc-sync">
            <span className="fc-label" style={{color:'#10b981'}}>AUTO-SYNC</span>
            <span className="fc-val">✓ 14 registros sincronizados</span>
          </div>
          <div className="fc fc-stat">
            <span className="fc-label" style={{color:'#93c5fd'}}>ESTADO FLOTA</span>
            <span className="fc-val">8 / 9 conductores activos</span>
          </div>

          {/* Back phone */}
          <div className="phone-wrap phone-back" aria-hidden="true">
            <div className="phone-frame">
              <div className="phone-screen" style={{background:'#111121', overflow: 'hidden'}}>
                <img src="/screenshot expense.png" alt="VanTrack Gastos" style={{width: '100%', height: 'auto', display: 'block'}} />
              </div>
            </div>
          </div>

          {/* Front phone */}
          <div className="phone-wrap phone-front">
            <div className="phone-frame">
              <div className="phone-screen" style={{background:'#0a0a0f', overflow: 'hidden'}}>
                 <img src="/screenshot home.png" alt="VanTrack Dashboard" style={{width: '100%', height: 'auto', display: 'block'}} />
              </div>
              <div className="phone-chin"><div className="home-bar"></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item"><span className="stat-val">500+</span><span className="stat-lab">Flotas activas globalmente</span></div>
          <div className="stat-item"><span className="stat-val">2M+</span><span className="stat-lab">Jornadas registradas</span></div>
          <div className="stat-item"><span className="stat-val">0</span><span className="stat-lab">Datos perdidos sin conexión</span></div>
          <div className="stat-item"><span className="stat-val">99.9%</span><span className="stat-lab">Disponibilidad</span></div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features">
        <div className="section">
          <div className="section-hd reveal">
            <span className="sec-tag">// funcionalidades</span>
            <h2>Diseñado para el día a día</h2>
            <p>Las herramientas que tus conductores y gerentes necesitan, diseñadas para funcionar en el mundo real, con o sin conexión.</p>
          </div>
          <div className="feat-grid">
            <div className="feat-card cg reveal">
              <div className="feat-icon" style={{background:'var(--green-dim)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
              </div>
              <h3>Arquitectura Offline-First</h3>
              <p>Nunca pierdas un solo registro. Los conductores trabajan con normalidad sin conectividad. Al recuperar la señal, todo se sincroniza automáticamente en segundo plano.</p>
              <span className="feat-tag" style={{background:'var(--green-dim)',color:'#10b981',border:'1px solid rgba(16,185,129,.22)'}}>Cero pérdida de datos</span>
            </div>
            <div className="feat-card cb reveal">
              <div className="feat-icon" style={{background:'var(--blue-dim)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <h3>Registro de actividad de la flota</h3>
              <p>Controla al detalle qué conductor usó cada vehículo, las horas de uso y el volumen total de paquetes transportados. Toda la información centralizada al instante.</p>
              <span className="feat-tag" style={{background:'var(--blue-dim)',color:'#93c5fd',border:'1px solid rgba(59,130,246,.2)'}}>Sincronización instantánea</span>
            </div>
            <div className="feat-card ca reveal">
              <div className="feat-icon" style={{background:'rgba(245,158,11,.1)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <h3>Gestión de gastos</h3>
              <p>Combustible, peajes, mantenimiento: regístralo todo en menos de 5 segundos. Los administradores revisan los costes de forma centralizada en el panel.</p>
              <span className="feat-tag" style={{background:'rgba(245,158,11,.08)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.2)'}}>Control de gastos</span>
            </div>
            <div className="feat-card cp reveal">
              <div className="feat-icon" style={{background:'var(--purple-dim)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3>Panel de administración</h3>
              <p>Tu centro de mando. Supervisa a cada conductor, furgoneta y gasto de forma centralizada, manteniendo el control total de tu flota.</p>
              <span className="feat-tag" style={{background:'var(--purple-dim)',color:'#a78bfa',border:'1px solid rgba(139,92,246,.2)'}}>Visión general de la flota</span>
            </div>
          </div>
        </div>
      </section>

      <div className="sep"></div>

      {/* HOW IT WORKS */}
      <section id="how-it-works">
        <div className="section">
          <div className="section-hd reveal">
            <span className="sec-tag">// flujo de trabajo</span>
            <h2>Listo en minutos</h2>
            <p>Sin días de formación. Sin departamento de TI. Toda tu flota operativa desde el primer día.</p>
          </div>
          <div className="steps">
            <div className="step reveal">
              <span className="step-num">01</span>
              <div className="step-icon" style={{background:'var(--blue-dim)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <h3>Crea cuentas de conductores</h3>
              <p>Añade a tus conductores en segundos. VanTrack se instala como una PWA en cualquier smartphone sin pasar por la App Store.</p>
            </div>
            <div className="step reveal">
              <span className="step-num">02</span>
              <div className="step-icon" style={{background:'var(--orange-dim)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <h3>Los conductores registran su jornada</h3>
              <p>Anotar la furgoneta utilizada, los paquetes a repartir y los gastos lleva menos de 10 segundos. ¿Sin señal? No hay problema, la app guarda todo localmente.</p>
            </div>
            <div className="step reveal">
              <span className="step-num">03</span>
              <div className="step-icon" style={{background:'var(--green-dim)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Revisa los datos</h3>
              <p>En el momento en que los conductores se reconectan, los datos fluyen a tu panel. Revisa el rendimiento y los costes de forma centralizada.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="sep"></div>

      {/* TESTIMONIALS */}
      <section id="testimonials">
        <div className="section">
          <div className="section-hd reveal" style={{textAlign:'center',maxWidth:'580px',margin:'0 auto 3.5rem'}}>
            <span className="sec-tag" style={{display:'block',textAlign:'center'}}>// más de 500 flotas confían en nosotros</span>
            <h2>Equipos reales. Resultados reales.</h2>
          </div>
          <div className="testi-grid">
            <div className="testi-card reveal">
              <div className="stars">★★★★★</div>
              <blockquote>"Antes de VanTrack perdíamos datos en zonas rurales sin señal. Ahora todo se sincroniza automáticamente al recuperar conexión."</blockquote>
              <div className="author">
                <div className="avatar" style={{background:'var(--blue-dim)',color:'#93c5fd'}}>MH</div>
                <div><div className="author-name">Marcus Holbrook</div><div className="author-role">Gestor de Flota</div></div>
              </div>
            </div>
            <div className="testi-card reveal">
              <div className="stars">★★★★★</div>
              <blockquote>"Solo con el control de gastos de combustible empezamos a ahorrar de inmediato. Los conductores lo registran en segundos."</blockquote>
              <div className="author">
                <div className="avatar" style={{background:'var(--green-dim)',color:'#10b981'}}>SP</div>
                <div><div className="author-name">Sandra Patel</div><div className="author-role">Directora de Operaciones</div></div>
              </div>
            </div>
            <div className="testi-card reveal">
              <div className="stars">★★★★★</div>
              <blockquote>"Tenemos 22 furgonetas y VanTrack me da una visión limpia de todo. Detecto los problemas de gastos antes de que ocurran."</blockquote>
              <div className="author">
                <div className="avatar" style={{background:'var(--orange-dim)',color:'#f97316'}}>JO</div>
                <div><div className="author-name">Jamie O'Connor</div><div className="author-role">Propietario</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      {/* FINAL CTA / EARLY ACCESS */}
      <div className="cta-wrap" id="early-access">
        <div className="cta-glow" aria-hidden="true"></div>
        <div className="cta-inner reveal">
          <span className="sec-tag" style={{display:'block',textAlign:'center',marginBottom:'1rem'}}>// acceso mvp</span>
          <h2>Únete a nuestra fase de pruebas (BETA)</h2>
          <p>VanTrack está en versión MVP. Únete ahora y disfruta de la aplicación de forma 100% gratuita mientras la construimos juntos con tu feedback.</p>
          <div className="cta-btns">
            <Link to={session ? "/app" : "/register"} className="l-btn l-btn-primary l-btn-lg">Crear cuenta gratis →</Link>
          </div>
          <p className="cta-note">Sin tarjetas de crédito · Gratis durante toda la fase Beta · Plazas limitadas</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="ft-inner">
          <div className="ft-top">
            <div className="ft-brand">
              <a href="#" className="logo">
                <img src="/logo.svg" alt="VanTrack Logo" style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '9px' }} />
                <span className="logo-name">VanTrack</span>
              </a>
              <p>Gestión de flotas para el mundo real. Construido offline-first para que tus conductores nunca pierdan el ritmo.</p>
            </div>
            <div className="ft-col"><h4>Producto</h4><ul><li><a href="#">Características</a></li><li><a href="#">Acceso Beta</a></li><li><a href="#">Novedades</a></li><li><a href="#">Hoja de ruta</a></li></ul></div>
            <div className="ft-col"><h4>Empresa</h4><ul><li><a href="#">Nosotros</a></li><li><a href="#">Blog</a></li><li><a href="#">Empleo</a></li><li><a href="#">Contacto</a></li></ul></div>
            <div className="ft-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacidad</a></li>
                <li><a href="#">Términos</a></li>
                <li><a href="#">Cookies</a></li>
                <li><Link to="/login" style={{color:'#93c5fd'}}>Iniciar Sesión →</Link></li>
              </ul>
            </div>
          </div>
          <div className="ft-bottom">
            <span>© 2024 VanTrack. Todos los derechos reservados.</span>
            <span style={{fontFamily:'var(--mono)',fontSize:'.72rem'}}>v4.0.0 · offline-first PWA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
