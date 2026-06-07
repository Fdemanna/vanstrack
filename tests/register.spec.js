import { test, expect } from '@playwright/test';

async function mockSupabaseRegister(page, options = {}) {
  const {
    userId = 'user-register-123',
    userName = 'Registrado Test',
    email = 'registrado@local.vanstrack',
  } = options;

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
    await page.click('button:has-text("¿No tienes cuenta? Regístrate")');
    await expect(page.locator('.login__title')).toContainText('Crear Cuenta');

    // 3. Rellenar formulario de registro
    await page.fill('input#register-name', 'Registrado Test');
    await page.fill('input#login-email', 'registrado');
    await page.fill('input#login-password', 'password123');
    await page.fill('input#login-confirm-password', 'password123');

    // 4. Enviar formulario
    await page.click('button[type="submit"]');

    // 5. Esperar redirección al Home e inicio automático
    await expect(page.locator('h1.page__title')).toContainText('¡Hola, Registrado Test!');
  });
});
