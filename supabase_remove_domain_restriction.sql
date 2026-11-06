-- ====================================================
-- QUITAR LA RESTRICCIÓN DE DOMINIO DE CORREO (@uteq.edu.mx)
-- Ejecutar en el SQL Editor de Supabase.
--
-- El código del frontend YA acepta cualquier correo (commit 050ece6).
-- Si tu proyecto seguía bloqueando otros dominios, la restricción
-- vive en Supabase: normalmente un TRIGGER sobre auth.users o un
-- Auth Hook "Before User Created".
-- ====================================================

-- ----------------------------------------------------
-- 1) DIAGNÓSTICO: muestra los triggers que existen sobre auth.users
--    Revisa el resultado antes de borrar; si ves uno que valida
--    el dominio del correo, ese es el que hay que quitar.
-- ----------------------------------------------------
SELECT
    t.tgname  AS trigger,
    p.proname AS funcion,
    p.prosrc  AS codigo
FROM pg_trigger t
JOIN pg_class c     ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p      ON p.oid = t.tgfoid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND NOT t.tgisinternal;

-- ----------------------------------------------------
-- 2) ELIMINAR triggers de auth.users cuya función valide dominios de correo
-- ----------------------------------------------------
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT
            t.tgname       AS trigger_name,
            p.proname      AS func_name,
            p.pronamespace AS func_ns
        FROM pg_trigger t
        JOIN pg_class c     ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p      ON p.oid = t.tgfoid
        WHERE n.nspname = 'auth'
          AND c.relname = 'users'
          AND NOT t.tgisinternal
          AND (
                p.prosrc ILIKE '%uteq%'
             OR p.prosrc ILIKE '%domain%'
             OR p.prosrc ILIKE '%edu.mx%'
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
        RAISE NOTICE 'Trigger eliminado: %', r.trigger_name;

        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %s.%I() CASCADE', r.func_ns::regnamespace, r.func_name);
            RAISE NOTICE 'Función eliminada: %', r.func_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo eliminar la función %: %', r.func_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ----------------------------------------------------
-- 3) Nombres comunes usados para esta restricción (por si acaso)
-- ----------------------------------------------------
DROP TRIGGER IF EXISTS check_user_domain_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.check_user_domain() CASCADE;

-- Hook "Before User Created" (si lo creaste con SQL)
DROP FUNCTION IF EXISTS public.hook_restrict_signup_by_email_domain(jsonb) CASCADE;
DROP TABLE IF EXISTS public.signup_email_domains CASCADE;

-- ====================================================
-- IMPORTANTE:
-- Si usas el Auth Hook "Before User Created" configurado desde el
-- dashboard, además debes desactivarlo ahí:
--   Supabase Dashboard > Authentication > Hooks > Before User Created
--   -> deshabilitar / eliminar el hook.
-- (Si el hook sigue activo pero su función ya no existe, bloqueará
--  TODOS los registros.)
-- ====================================================
