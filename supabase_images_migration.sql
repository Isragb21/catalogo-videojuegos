-- ====================================================
-- MIGRACIÓN: ALMACENAMIENTO DE IMÁGENES EN SUPABASE STORAGE
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ====================================================

-- ----------------------------------------------------
-- 1. Crear el bucket público para imágenes de videojuegos
-- ----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'game-images',
    'game-images',
    true,
    5242880, -- 5 MB máximo por archivo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- ----------------------------------------------------
-- 2. Guardar la ruta interna del objeto en la tabla videogames
--    (permite borrar la imagen del Storage al editar/eliminar)
-- ----------------------------------------------------
ALTER TABLE public.videogames
    ADD COLUMN IF NOT EXISTS image_path TEXT;

-- ----------------------------------------------------
-- 3. Políticas de acceso al Storage (idempotentes)
-- ----------------------------------------------------

-- Lectura pública de las imágenes
DROP POLICY IF EXISTS "Public read access for game images" ON storage.objects;
CREATE POLICY "Public read access for game images"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-images');

-- Subida de imágenes
DROP POLICY IF EXISTS "Authenticated users can upload game images" ON storage.objects;
CREATE POLICY "Authenticated users can upload game images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'game-images');

-- Actualización de imágenes
DROP POLICY IF EXISTS "Authenticated users can update game images" ON storage.objects;
CREATE POLICY "Authenticated users can update game images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'game-images');

-- Eliminación de imágenes
DROP POLICY IF EXISTS "Authenticated users can delete game images" ON storage.objects;
CREATE POLICY "Authenticated users can delete game images"
ON storage.objects FOR DELETE
USING (bucket_id = 'game-images');

-- ====================================================
-- NOTA: El backend usa la Service Role Key, por lo que
-- ignora RLS; estas políticas protegen accesos directos
-- desde el cliente. El bucket es público para poder
-- mostrar las imágenes vía URL pública.
-- ====================================================
