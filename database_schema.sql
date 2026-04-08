-- ====================================================
-- 1. CREACIÓN DE TABLAS PRINCIPALES
-- ====================================================

-- Habilitar extensión para encriptar contraseñas manualmente
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    rol TEXT DEFAULT 'cliente',
    two_factor_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Videojuegos
CREATE TABLE IF NOT EXISTS public.videogames (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    price NUMERIC NOT NULL,
    image_url TEXT,
    stock INT DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Carrito de Compras
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    videogame_id UUID REFERENCES public.videogames(id) ON DELETE CASCADE NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, videogame_id)
);

-- Tabla de Credenciales Biométricas (WebAuthn)
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================
-- 2. CREACIÓN DEL USUARIO ADMINISTRADOR POR DEFECTO
-- ====================================================
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- 1. Insertar el usuario en Supabase Auth
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    ) VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        '2023371154@uteq.edu.mx', crypt('8vSkLsAZ', gen_salt('bf')), 
        now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );

    -- 2. Insertar en identities (Obligatorio en Supabase para permitir login)
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, format('{"sub":"%s", "email":"2023371154@uteq.edu.mx"}', new_user_id)::jsonb, 'email', now(), now(), now()
    );

    -- 3. Insertar el perfil con el rol ADMIN
    INSERT INTO public.profiles (
        id, email, full_name, rol, created_at
    ) VALUES (
        new_user_id, '2023371154@uteq.edu.mx', 'israel', 'admin', now()
    );
END $$;