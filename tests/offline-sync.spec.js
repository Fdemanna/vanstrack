import { test, expect } from '@playwright/test';

let isOfflineState = false;

// Utilidad para mockear las llamadas API de Supabase de manera determinista
async function mockSupabase(page, options = {}) {
  const {
    userId = 'user-123',
    userName = 'Trabajador Test',
    role = 'worker',
    passwordChanged = true,
    vans = [{ id: 'van-1', label: 'Furgo Test 01', color: '#ff0000', is_active: true }],
    expenses = [],
    insertStatus = 200,
    insertResponse = null
  } = options;

  // Interceptar Auth: login con contraseña
  await page.route(url => url.pathname.includes('/auth/v1/token'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mocked-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mocked-refresh-token',
        user: { id: userId, email: `${userId}@local.vanstrack`, aud: 'authenticated', role: 'authenticated' }
      })
    });
  });

  // Interceptar Auth: cargar usuario
  await page.route(url => url.pathname.includes('/auth/v1/user'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: userId, email: `${userId}@local.vanstrack`, aud: 'authenticated', role: 'authenticated' })
    });
  });

  // Interceptar Auth: logout
  await page.route(url => url.pathname.includes('/auth/v1/logout'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });

  // Interceptar BD: Perfil de usuario (manejar listado o elemento único)
  await page.route(url => url.pathname.includes('/rest/v1/profiles'), async (route) => {
    const urlStr = route.request().url();
    if (urlStr.includes('id=eq.')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: userId, name: userName, role, password_changed: passwordChanged })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: userId, name: userName, role, password_changed: passwordChanged }])
      });
    }
  });

  // Interceptar BD: Furgonetas activas o todas
  await page.route(url => url.pathname.includes('/rest/v1/vans'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(vans)
    });
  });

  // Interceptar BD: Listar e Insertar Gastos
  await page.route(url => url.pathname.includes('/rest/v1/expenses'), async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(expenses)
      });
    } else if (route.request().method() === 'POST') {
      if (insertStatus !== 200) {
        await route.fulfill({
          status: insertStatus,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'DB Constraint Violation', message: 'Inyección inválida o RLS bloqueado' })
        });
      } else {
        const defaultInsertResp = insertResponse || {
          id: `exp-${Date.now()}`,
          user_id: userId,
          van_id: vans[0]?.id || 'van-1',
          concept: 'Peaje Test',
          amount: 15.5,
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(defaultInsertResp)
        });
      }
    } else {
      await route.fallback();
    }
  });

  // Interceptar BD: Entregas
  await page.route(url => url.pathname.includes('/rest/v1/deliveries'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Interceptor offline global para llamadas de Supabase (excepto perfil y auth para permitir reload)
  await page.route(url => url.pathname.includes('/auth/v1/') || url.pathname.includes('/rest/v1/'), async (route) => {
    const urlStr = route.request().url();
    const isProfileOrUser = urlStr.includes('/rest/v1/profiles') || urlStr.includes('/auth/v1/user') || urlStr.includes('/auth/v1/token');
    if (isOfflineState && !isProfileOrUser) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'TypeError', message: 'Failed to fetch (Simulated Offline)' })
      });
    } else {
      await route.fallback();
    }
  });
}

async function setOfflineState(page, offline) {
  isOfflineState = offline;
  await page.addInitScript((val) => {
    window.__mockOffline = val;
    Object.defineProperty(navigator, 'onLine', {
      get() { return !window.__mockOffline; },
      configurable: true
    });
  }, offline);
  await page.evaluate((val) => {
    window.__mockOffline = val;
    window.dispatchEvent(new Event(val ? 'offline' : 'online'));
  }, offline);
}

test.describe('VanTrack v4: Pruebas de Estrés y Offline-First', () => {

  test.beforeEach(async ({ context }) => {
    isOfflineState = false;
    
    // Desactivar el Service Worker en las pruebas E2E para evitar problemas de red HMR/Localhost
    await context.addInitScript(() => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        Object.defineProperty(navigator, 'serviceWorker', {
          get() {
            return {
              register: () => Promise.resolve({}),
              addEventListener: () => {},
              removeEventListener: () => {},
            };
          },
          configurable: true,
        });
      }
    });

    // Limpiar base de datos IndexedDB y almacenamiento local en cada prueba para aislamiento total
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('keyval-store');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.close();
  });

  test('Sincronización de mutaciones offline, persistencia tras recarga y UI optimista', async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    const userExpenses = [];
    await mockSupabase(page, {
      userId: 'user-123',
      userName: 'Trabajador Test',
      role: 'worker',
      expenses: userExpenses
    });

    // 1. Iniciar Sesión (Online)
    await page.goto('/login');
    await page.fill('input#login-email', 'testuser');
    await page.fill('input#login-password', 'password123');
    await page.click('button[type="submit"]');

    // Esperar redirección al Inicio
    await expect(page.locator('h1.page__title')).toContainText('¡Hola, Trabajador Test!');

    // Ir a la pestaña de Gastos
    await page.click('a[href="/expenses"]:visible');
    await expect(page.locator('h1.page__title')).toContainText('Gastos');

    // Esperar a que finalice la carga de datos inicial y desaparezca el spinner
    await expect(page.locator('.spinner')).not.toBeVisible();

    // Abrir el modal una vez online para calentar la caché del selector de furgonetas
    await page.click('button.fab');
    await expect(page.locator('select#expense-van option')).toHaveCount(2); // Opción por defecto + Furgoneta mock
    await page.click('button.modal__close');

    // 2. Simular corte de red (Offline)
    await setOfflineState(page, true);

    // Registrar un gasto offline
    await page.click('button.fab');
    await page.fill('input#expense-concept', 'Gasolina Offline');
    await page.fill('input#expense-amount', '45.80');
    await page.selectOption('select#expense-van', { index: 1 });
    await page.click('button[type="submit"]');

    // Validar UI Optimista (la tarjeta aparece inmediatamente con estilos offline)
    const pendingCard = page.locator('.expense-card--pending');
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard.locator('.expense-card__concept')).toContainText('Gasolina Offline');
    await expect(pendingCard.locator('.expense-card__amount')).toContainText('45.80 €');
    
    // Verificar opacidad y bordes punteados naranja configurados en el CSS de offline
    await expect(pendingCard).toHaveCSS('opacity', '0.7');
    await expect(pendingCard).toHaveCSS('border-style', 'dashed');

    // 3. Simular recarga de página offline para validar persistencia de IndexedDB
    await page.reload();
    await expect(page.locator('h1.page__title')).toContainText('Gastos');
    
    const restoredCard = page.locator('.expense-card--pending');
    await expect(restoredCard).toBeVisible();
    await expect(restoredCard.locator('.expense-card__concept')).toContainText('Gasolina Offline');

    // 4. Reconectar red y simular sincronización exitosa en background
    const syncExpenseResponse = {
      id: 'exp-real-999',
      user_id: 'user-123',
      van_id: 'van-1',
      concept: 'Gasolina Offline',
      amount: 45.80,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    await mockSupabase(page, {
      userId: 'user-123',
      userName: 'Trabajador Test',
      role: 'worker',
      expenses: [syncExpenseResponse]
    });

    await setOfflineState(page, false);

    // Force all pending mutations to be paused so resumePausedMutations will process them
    await page.evaluate(() => {
      const mutations = window.__queryClient.getMutationCache().getAll();
      mutations.forEach(m => {
        if (m.state.status === 'pending') {
          m.state.isPaused = true;
        }
      });
    });

    // Explicitly trigger execution of the restored offline mutation queue
    await page.evaluate(() => window.__queryClient.resumePausedMutations());

    // Verificar que la tarjeta se sincroniza y pasa al estado normal (desaparecen estilos optimistas)
    const syncedCard = page.locator('.expense-card').filter({ hasText: 'Gasolina Offline' });
    await expect(syncedCard).toBeVisible();
    await expect(syncedCard).not.toHaveClass(/expense-card--pending/);
    await expect(syncedCard).toHaveCSS('opacity', '1');
  });

  test('Aislamiento de caché multiusuario (Evitar fugas de datos al cambiar de sesión)', async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    // 1. Iniciar sesión como Conductor A con sus gastos propios
    await mockSupabase(page, {
      userId: 'conductor-A',
      userName: 'Conductor A',
      role: 'worker',
      expenses: [{ id: 'exp-A', concept: 'Gasto Privado A', amount: 100, van_id: 'van-1', date: new Date().toISOString().split('T')[0] }]
    });

    await page.goto('/login');
    await page.fill('input#login-email', 'conductorA');
    await page.fill('input#login-password', 'passwordA');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1.page__title')).toContainText('¡Hola, Conductor A!');

    // Cargar sección de Gastos
    await page.click('a[href="/expenses"]:visible');
    await expect(page.locator('.expense-card')).toContainText('Gasto Privado A');

    // 2. Cerrar sesión estando online (para permitir la llamada de signOut exitosa)
    await page.click('a[href="/profile"]:visible');
    await page.click('button:has-text("Cerrar Sesión")');
    await expect(page.locator('form.login__form')).toBeVisible();

    // 3. Cambiar mock para simular Conductor B
    await mockSupabase(page, {
      userId: 'conductor-B',
      userName: 'Conductor B',
      role: 'worker',
      expenses: [{ id: 'exp-B', concept: 'Gasto Privado B', amount: 20, van_id: 'van-1', date: new Date().toISOString().split('T')[0] }]
    });

    // Iniciar sesión como Conductor B (Online)
    await page.fill('input#login-email', 'conductorB');
    await page.fill('input#login-password', 'passwordB');
    await page.click('button[type="submit"]');

    // Esperar a que entre al Home
    await expect(page.locator('h1.page__title')).toContainText('¡Hola, Conductor B!');

    // Cargar Gastos Online para cachear
    await page.click('a[href="/expenses"]:visible');
    await expect(page.locator('.expense-card').first()).toBeVisible();
    await expect(page.locator('.expenses-list')).toContainText('Gasto Privado B');

    // 4. Ir a offline
    await setOfflineState(page, true);

    // Recargar página offline para verificar que lee de la caché IndexedDB aislada
    await page.reload();
    await expect(page.locator('h1.page__title')).toContainText('Gastos');
    
    await expect(page.locator('.expense-card').first()).toBeVisible();
    await expect(page.locator('.expenses-list')).not.toContainText('Gasto Privado A');
    await expect(page.locator('.expenses-list')).toContainText('Gasto Privado B');
  });

  test('Rollback visual ante fallo definitivo del servidor (RLS/Validación)', async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await mockSupabase(page, {
      userId: 'user-123',
      userName: 'Trabajador Test',
      role: 'worker',
      expenses: []
    });

    // Iniciar sesión
    await page.goto('/login');
    await page.fill('input#login-email', 'testuser');
    await page.fill('input#login-password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1.page__title')).toContainText('¡Hola, Trabajador Test!');

    await page.click('a[href="/expenses"]:visible');
    await expect(page.locator('.spinner')).not.toBeVisible();
    
    // Calentar la caché del selector abriendo el modal online
    await page.click('button.fab');
    await expect(page.locator('select#expense-van option')).toHaveCount(2);
    await page.click('button.modal__close');

    // 1. Simular offline e insertar registro
    await setOfflineState(page, true);
    await page.click('button.fab');
    await page.fill('input#expense-concept', 'Concepto Erróneo');
    await page.fill('input#expense-amount', '10.00');
    await page.selectOption('select#expense-van', { index: 1 });
    await page.click('button[type="submit"]');

    // Confirmar presencia optimista en pantalla
    const pendingCard = page.locator('.expense-card--pending');
    await expect(pendingCard).toBeVisible();

    // 2. Configurar mock para retornar 400 Bad Request en la inserción real
    await mockSupabase(page, {
      userId: 'user-123',
      userName: 'Trabajador Test',
      role: 'worker',
      expenses: [],
      insertStatus: 400
    });

    // 3. Volver online
    await setOfflineState(page, false);

    // Verificar que la tarjeta optimista se remueve de pantalla (Rollback)
    await expect(pendingCard).not.toBeVisible();
    await expect(page.locator('.expense-card')).toHaveCount(0);

    // Verificar que aparece el Toast rojo de error
    const toast = page.locator('.toast--error');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Error al registrar gasto');
  });

});
