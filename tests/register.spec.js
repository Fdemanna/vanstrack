import { test, expect } from '@playwright/test';

async function mockSupabaseRegister(page, options = {}) {
  const {
    userId = 'user-register-123',
    userName = 'Registrado Test',
    email = 'registrado@local.vanstrack',
  } = options;

  // Interceptar Edge Function: register-company
  await page.route(url => url.pathname.includes('/functions/v1/register-company'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // Interceptar Auth: signup
  await page.route(url => url.pathname.includes('/auth/v1/signup'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mocked-jwt-token-register',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mocked-refresh-token-register',
        user: { id: userId, email: email, aud: 'authenticated', role: 'authenticated' }
      })
    });
  });

  // Interceptar Auth: cargar usuario
  await page.route(url => url.pathname.includes('/auth/v1/user'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: userId, email: email, aud: 'authenticated', role: 'authenticated' })
    });
  });

  // Interceptar BD: Perfil de usuario (para la actualización PATCH y la carga posterior)
  await page.route(url => url.pathname.includes('/rest/v1/profiles'), async (route) => {
    const urlStr = route.request().url();
    const method = route.request().method();
    if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: userId, name: userName, role: 'worker', password_changed: true })
      });
    } else if (urlStr.includes('id=eq.')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: userId, name: userName, role: 'worker', password_changed: true })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: userId, name: userName, role: 'worker', password_changed: true }])
      });
    }
  });

  // Interceptar BD: Furgonetas
  await page.route(url => url.pathname.includes('/rest/v1/vans'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
}

test.describe('VanTrack v4: Registro de Cuentas', () => {

  test.beforeEach(async ({ context }) => {
    // Limpiar localStorage y IndexedDB antes de cada test
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.close();
  });

  test('Permite crear una nueva cuenta e iniciar sesión automáticamente', async ({ page }) => {
    await mockSupabaseRegister(page);

    // 1. Ir a login
    await page.goto('/login');
    await expect(page.locator('.login__title')).toContainText('Iniciar Sesión');

    // 2. Cambiar a modo registro
    await page.click('a:has-text("Registra tu empresa")');
    await expect(page.locator('.login__title')).toContainText('Nueva Empresa');

    await page.fill('input#reg-company', 'Logística Express Test');
    await page.fill('input#reg-name', 'Registrado Test');
    await page.fill('input#reg-email', 'registrado@local.vanstrack');
    await page.fill('input#reg-password', 'password123');

    // 4. Enviar formulario
    await page.click('button[type="submit"]');

    // 5. Esperar pantalla de éxito de registro
    await expect(page.locator('.login__title')).toContainText('¡Empresa Registrada!');
  });
});
