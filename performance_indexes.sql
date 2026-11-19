-- ============================================================================
-- Práctica 12 — Índices para las consultas críticas
-- Ejecutar en Supabase -> SQL Editor. Seguro repetirlo (IF NOT EXISTS).
-- ============================================================================

-- Catálogo: filtro is_active + orden por created_at (endpoint /api/videogames)
CREATE INDEX IF NOT EXISTS idx_videogames_active_created
    ON public.videogames (is_active, created_at DESC);

-- Filtros nuevos del catálogo (plataforma y categoría)
CREATE INDEX IF NOT EXISTS idx_videogames_platform
    ON public.videogames (platform);
CREATE INDEX IF NOT EXISTS idx_videogames_category
    ON public.videogames (category);

-- Carrito: GET /api/cart/:userId y DELETE por usuario
CREATE INDEX IF NOT EXISTS idx_cart_items_user
    ON public.cart_items (user_id);

-- Órdenes: GET /api/orders/:userId ordenado por fecha
CREATE INDEX IF NOT EXISTS idx_orders_user_created
    ON public.orders (user_id, created_at DESC);

-- Items de orden: join anidado order_items -> orders
CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON public.order_items (order_id);

-- Verificación de índices creados
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
