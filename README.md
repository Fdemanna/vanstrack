# 🚚 VansTrack v4 - Gestión de Flotas y Repartos

¡Bienvenido a **VansTrack v4**! Una aplicación web progresiva (PWA) de alto rendimiento y robustez diseñada para la gestión integral de flotas de vehículos (furgonetas), registros de entregas diarios, control de gastos de combustible y mantenimiento, y reportes administrativos. 

VansTrack está construido bajo una arquitectura **Offline-First**, permitiendo a los repartidores registrar datos sin conexión a internet y sincronizarlos automáticamente al recuperar la señal.

---

## 🚀 Tecnologías Clave

* **Frontend:** React 19, React Router DOM v7, Vite 8, Vanilla CSS (CSS moderno).
* **Base de Datos & Auth:** Supabase (PostgreSQL, Row Level Security (RLS)).
* **Edge Functions:** Supabase Edge Functions (Deno + TypeScript) para operaciones administrativas seguras (`create-worker`, `reset-password`).
* **Estado & Offline Cache:** TanStack Query v5 + `idb-keyval` (IndexedDB) para persistencia e hidratación del caché local en modo offline.
* **PWA:** `vite-plugin-pwa` para soporte completo de Service Worker, instalación en dispositivos y caché de assets.
* **Pruebas:** Playwright para pruebas E2E.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
* [Supabase CLI](https://supabase.com/docs/guides/cli) (para la gestión de migraciones y Edge Functions)
* Una cuenta activa en [Supabase](https://supabase.com/)

---

## 📦 Configuración Inicial

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone <URL_DEL_REPOSITORIO>
cd vanstrack
npm install
```

### 2. Configuración del Entorno Local (Frontend)
Copia el archivo de plantilla `.env.local.example` a `.env.local`:
```bash
cp .env.local.example .env.local
```
Edita `.env.local` y añade tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key-aqui
```

### 3. Configuración del Backend (Supabase)
Inicia sesión en tu cuenta de Supabase desde la CLI:
```bash
npx supabase login
```

Enlaza la CLI con tu proyecto de Supabase (necesitarás el ID de tu proyecto y la contraseña de la base de datos):
```bash
npx supabase link --project-ref tu-project-ref-id
```

Aplica las migraciones de base de datos existentes al servidor de Supabase:
```bash
npx supabase db push
```
*(Esto creará las tablas necesarias: `profiles`, `vans`, `deliveries`, `expenses` y configurará las políticas RLS y triggers de integridad).*

---

## ⚡ Configuración y Despliegue de Edge Functions

El proyecto cuenta con dos Edge Functions para gestionar de forma segura los usuarios de la plataforma:
1. `create-worker`: Permite a los administradores crear cuentas de repartidores (Workers) validando roles de forma segura.
2. `reset-password`: Permite a los administradores generar enlaces de restablecimiento de contraseña para sus repartidores.

### 1. Configurar variables de entorno de Edge Functions (CORS / Orígenes permitidos)
Para evitar ataques CSRF y accesos no autorizados, las Edge Functions utilizan una política estricta de CORS basada en la variable `ALLOWED_ORIGIN`.

Crea el archivo `.env` en la carpeta de funciones para desarrollo local:
```bash
cp supabase/functions/.env.example supabase/functions/.env
```
Establece la dirección permitida (en local usualmente `http://localhost:5173`).

Para el **entorno de producción en la nube**, configura el secreto en el panel de Supabase o mediante CLI:
```bash
npx supabase secrets set ALLOWED_ORIGIN="https://tu-dominio-de-produccion.com"
```

### 2. Desplegar Edge Functions a Supabase
Ejecuta los siguientes comandos para compilar y subir las funciones:
```bash
npx supabase functions deploy create-worker
npx supabase functions deploy reset-password
```

---

## 💻 Desarrollo Local

Para iniciar el servidor de desarrollo local:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## 🛡️ Seguridad y Buenas Prácticas

VansTrack v4 ha sido diseñado con un enfoque riguroso de seguridad:
* **Row Level Security (RLS):** RLS está activo y forzado en todas las tablas de la base de datos. Los repartidores (`worker`) solo pueden leer y modificar sus propios registros de furgonetas, entregas y gastos. Los administradores (`admin`) poseen acceso completo de lectura y gestión de trabajadores.
* **Variables de Entorno:** Los archivos de variables de entorno `.env`, `.env.local`, `*.local`, `supabase/functions/.env` y carpetas de configuración sensible se encuentran estrictamente excluidos en `.gitignore` para evitar filtraciones de claves privadas.
* **Cabeceras de Seguridad:** El proyecto incluye configuraciones listas para producción para mitigar ataques de inyección (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) tanto en Vercel (`vercel.json`) como en Netlify (`public/_headers`).

---

## 📂 Estructura del Proyecto

```text
├── .env.local.example       # Plantilla de variables de entorno frontend
├── vercel.json              # Configuración de cabeceras de seguridad para Vercel
├── package.json             # Dependencias y scripts npm
├── supabase/
│   ├── config.toml          # Configuración del proyecto Supabase
│   ├── migrations/          # Migraciones SQL para estructurar la DB
│   └── functions/           # Edge Functions (create-worker, reset-password)
│       └── .env.example     # Plantilla de origen permitido (CORS) para Deno
└── src/
    ├── App.jsx              # Punto de entrada de React, Rutas y Proveedores
    ├── main.jsx             # Renderizado e inicialización de PWA
    ├── lib/
    │   └── supabase.js      # Cliente de Supabase configurado
    ├── pages/               # Vistas (Home, Login, Admin, Worker, etc.)
    └── styles/              # Archivos CSS personalizados
```

---

## 🚀 Despliegue en Producción

Puedes desplegar el frontend de forma rápida en plataformas como **Vercel** o **Netlify**:
1. Conecta tu repositorio.
2. Configura las variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`) en el panel de control del hosting.
3. El comando de compilación es `npm run build` y el directorio de salida es `dist`.
4. Las cabeceras de seguridad ya están integradas de manera automática a través de los archivos de configuración (`vercel.json` o `public/_headers`).
