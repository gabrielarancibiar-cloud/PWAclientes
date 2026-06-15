# VALEPAC - PWA Creación de Clientes

Repositorio limpio para subir a GitHub y desplegar en Vercel.

## Qué hace

- Publica una PWA en `/clientes/`.
- Recoge estos datos:
  - RUT empresa
  - Razón social
  - Giro
  - Teléfono
  - Dirección
  - Comuna
  - Mail
  - Nombre contacto
- Guarda la solicitud en Supabase.
- Envía correo al destinatario definido en Vercel.

## Estructura correcta en GitHub

Al abrir el repositorio, debe verse así, directamente en la raíz:

```txt
api/
public/
supabase/
.env.example
.gitignore
package.json
README.md
vercel.json
```

No debe quedar dentro de una carpeta madre tipo `valepac-clientes-repo-clean/`.

## Paso 1: Supabase

Ir a Supabase > SQL Editor y ejecutar:

```txt
supabase/001_clientes_solicitudes.sql
```

## Paso 2: GitHub

Subir todo el contenido de este repositorio.

## Paso 3: Vercel

Crear proyecto desde GitHub.

Configuración recomendada:

- Framework Preset: Other
- Root Directory: `./` o vacío
- Build Command: vacío o `npm run build`
- Output Directory: vacío

## Paso 4: Variables de entorno en Vercel

En Vercel > Project > Settings > Environment Variables agregar:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CLIENTES_DESTINO_EMAIL
CLIENTES_REMITENTE_EMAIL
```

Ejemplo:

```txt
CLIENTES_DESTINO_EMAIL=clientes@tudominio.cl
CLIENTES_REMITENTE_EMAIL=notificaciones@tudominio.cl
```

Importante: `CLIENTES_REMITENTE_EMAIL` debe estar autorizado/verificado en Resend.

## URL final

La PWA queda en:

```txt
https://tu-proyecto.vercel.app/clientes/
```

La raíz también redirige al formulario:

```txt
https://tu-proyecto.vercel.app/
```

## QR

El QR debe apuntar a:

```txt
https://tu-proyecto.vercel.app/clientes/
```

## Prueba rápida

1. Entrar a `/clientes/`.
2. Completar datos válidos.
3. Enviar.
4. Revisar tabla `clientes_solicitudes` en Supabase.
5. Revisar correo destino.

Si el formulario abre pero no envía, el problema casi seguro son variables de entorno o dominio no verificado en Resend.
