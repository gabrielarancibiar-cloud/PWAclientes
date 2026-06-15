# VALEPAC - PWA Creación de Clientes

PWA pública para que un cliente escanee un QR y complete los datos necesarios para iniciar la creación de cliente.

## Datos que recoge

- RUT empresa
- Razón social
- Giro
- Teléfono
- Dirección
- Comuna
- Mail
- Nombre contacto

## Ruta pública

Cuando esté desplegado en Vercel, el formulario quedará en:

```txt
https://TU-DOMINIO.vercel.app/clientes/
```

Ese enlace es el que debe ir dentro del QR.

## Estructura

```txt
public/clientes/index.html
public/clientes/styles.css
public/clientes/app.js
public/clientes/manifest.webmanifest
public/clientes/sw.js
api/crear-cliente.js
supabase/001_clientes_solicitudes.sql
.env.example
```

## Paso 1: Crear tabla en Supabase

1. Entrar a Supabase.
2. Ir a SQL Editor.
3. Abrir el archivo:

```txt
supabase/001_clientes_solicitudes.sql
```

4. Ejecutarlo completo.

## Paso 2: Subir a GitHub

1. Crear repositorio nuevo en GitHub.
2. Subir todos los archivos de este paquete.
3. Conectar ese repositorio a Vercel.

## Paso 3: Variables en Vercel

En Vercel > Project > Settings > Environment Variables, agregar:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CLIENTES_DESTINO_EMAIL
CLIENTES_REMITENTE_EMAIL
```

Ejemplo:

```txt
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
RESEND_API_KEY=re_xxxxx
CLIENTES_DESTINO_EMAIL=clientes@tudominio.cl
CLIENTES_REMITENTE_EMAIL=notificaciones@tudominio.cl
```

## Paso 4: Deploy

Después de cargar las variables, hacer redeploy en Vercel.

## Resultado esperado

El cliente abre `/clientes/`, completa el formulario y presiona **Enviar solicitud**.

El sistema hace dos cosas:

1. Guarda el registro en Supabase en la tabla `clientes_solicitudes`.
2. Envía un correo al mail configurado en `CLIENTES_DESTINO_EMAIL`.

## Nota importante sobre correo

Este proyecto usa Resend para enviar correos.

Para producción, conviene verificar un dominio propio en Resend y usar un remitente como:

```txt
notificaciones@tudominio.cl
```

Para pruebas, Resend permite usar:

```txt
onboarding@resend.dev
```

pero puede tener restricciones de destinatario.

## Seguridad

La PWA no usa claves de Supabase en el navegador.

El guardado se hace mediante:

```txt
/api/crear-cliente
```

Esa API corre en Vercel y usa `SUPABASE_SERVICE_ROLE_KEY` solo del lado servidor.

No publiques la `SUPABASE_SERVICE_ROLE_KEY` en GitHub.
