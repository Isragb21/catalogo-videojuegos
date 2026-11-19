-- ============================================================================
-- Migración: CATEGORÍA para el catálogo de videojuegos
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
--
-- La app ya lee la columna `category`. No hay que tocar el backend:
-- /api/videogames hace SELECT * y la devuelve sola.
-- (Género y categoría se unificaron en un solo campo: categoría.)
-- ============================================================================

-- 1) Agregar la columna (seguro ejecutarlo más de una vez).
ALTER TABLE public.videogames
    ADD COLUMN IF NOT EXISTS category TEXT;

-- 2) Llenar los juegos que ya existen. Ajusta los valores a tu gusto.
--    Se usa ILIKE para que funcione aunque cambie la tilde o la capitalización.
UPDATE public.videogames
SET category = CASE
        WHEN title ILIKE 'Minecraft%'           THEN 'SANDBOX'
        WHEN title ILIKE 'God of War%'          THEN 'AVENTURA'
        WHEN title ILIKE 'Halo%'                THEN 'SHOOTER'
        WHEN title ILIKE 'The Legend of Zelda%' THEN 'AVENTURA'
        ELSE category
    END
WHERE title ILIKE 'Minecraft%'
   OR title ILIKE 'God of War%'
   OR title ILIKE 'Halo%'
   OR title ILIKE 'The Legend of Zelda%';

-- 3) Índices para que los filtros por plataforma/categoría sean rápidos.
CREATE INDEX IF NOT EXISTS idx_videogames_platform ON public.videogames (platform);
CREATE INDEX IF NOT EXISTS idx_videogames_category ON public.videogames (category);

-- 4) Verificación: aquí deben aparecer título, plataforma y categoría.
SELECT title, platform, category
FROM public.videogames
WHERE is_active = true
ORDER BY created_at DESC;

-- ============================================================================
-- Para juegos NUEVos, incluye la columna al insertar:
--
-- INSERT INTO public.videogames
--   (title, platform, price, stock, image_path, category)
-- VALUES
--   ('Elden Ring', 'PlayStation 5', 999, 10, '', 'AVENTURA');
--
-- Categorías sugeridas (para que los chips queden parejos):
-- ACCION, AVENTURA, SHOOTER, CARRERAS, DEPORTES, ESTRATEGIA, ROL, SANDBOX, LUCHA
-- ============================================================================
