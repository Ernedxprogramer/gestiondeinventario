# Inventory Gestion API

API de gestion de inventario lista para desplegar en Vercel. Incluye autenticacion con JWT, catalogos base, productos, movimientos de inventario, ordenes de compra, ordenes de venta, alertas y panel de KPIs.

## Stack

- Next.js con Route Handlers
- Prisma ORM
- PostgreSQL
- JWT con `jose`
- Validaciones con `zod`

## Funcionalidades incluidas

- Registro del primer usuario como administrador
- Inicio de sesion y autenticacion por token Bearer
- Roles: `ADMIN`, `MANAGER`, `STAFF`
- Consulta y administracion basica de usuarios
- CRUD de categorias, proveedores y clientes
- CRUD de productos con SKU, codigo de barras, precios, stock minimo y ubicacion
- Ajustes manuales de inventario con trazabilidad
- Historial de movimientos de inventario
- Ordenes de compra y recepcion parcial o total
- Ordenes de venta y descuento de stock al confirmar
- Alertas de bajo stock
- Dashboard y KPIs
- Bitacora de auditoria interna

## Preparacion local

1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
cp .env.example .env
```

3. Configura `DATABASE_URL` con PostgreSQL.

4. Ejecuta migraciones y seed:

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

5. Inicia el proyecto:

```bash
npm run dev
```

## Despliegue en Vercel

1. Sube este proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Agrega estas variables de entorno en Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `APP_NAME`
4. Usa una base PostgreSQL compatible con Vercel, por ejemplo Neon, Supabase o Vercel Postgres.
5. En el proceso de build, el script ya ejecuta `prisma generate && next build`.
6. Despues del despliegue, corre migraciones en produccion:

```bash
npx prisma migrate deploy
```

## Usuario inicial

El seed crea este acceso:

- Email: `admin@inventory.local`
- Password: `Admin12345!`

Cambialo en cuanto entres en produccion.

## Endpoints principales

### Autenticacion

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Catalogos

- `GET /api/users`
- `PATCH /api/users/:id`
- `GET|POST /api/categories`
- `GET|PATCH|DELETE /api/categories/:id`
- `GET|POST /api/suppliers`
- `GET|PATCH|DELETE /api/suppliers/:id`
- `GET|POST /api/customers`
- `GET|PATCH|DELETE /api/customers/:id`

### Productos e inventario

- `GET|POST /api/products`
- `GET|PATCH|DELETE /api/products/:id`
- `POST /api/inventory/adjustments`
- `GET /api/inventory/movements`
- `GET /api/inventory/summary`
- `GET /api/alerts/low-stock`

### Compras y ventas

- `GET|POST /api/purchase-orders`
- `GET|DELETE /api/purchase-orders/:id`
- `POST /api/purchase-orders/:id/receive`
- `GET|POST /api/sales-orders`
- `GET|DELETE /api/sales-orders/:id`
- `POST /api/sales-orders/:id/confirm`

### Analitica

- `GET /api/dashboard`
- `GET /api/reports/kpis`
- `GET /api/audit-logs`

## Ejemplos de uso

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inventory.local","password":"Admin12345!"}'
```

### Crear producto

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "sku":"SKU-001",
    "name":"Cafe molido",
    "salePrice":120,
    "costPrice":80,
    "stock":50,
    "minStock":10,
    "unit":"bolsa"
  }'
```

### Ajuste de inventario

```bash
curl -X POST http://localhost:3000/api/inventory/adjustments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "productId":"PRODUCT_ID",
    "quantity":5,
    "direction":"OUT",
    "note":"Merma por dano"
  }'
```

## Siguientes mejoras recomendadas

- Multi-sucursal con stock por almacen
- Lotes y fechas de caducidad
- Carga masiva por CSV o Excel
- Modulo de devoluciones
- Webhooks o notificaciones por stock critico
- Documentacion OpenAPI/Swagger
