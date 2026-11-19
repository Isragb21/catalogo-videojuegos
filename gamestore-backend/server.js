require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE CORS (Actualizada para puerto 8100)
// ==========================================
const allowedOrigins = [
  'http://localhost:8100', 
  'http://localhost:4200',
  'https://catalogo-videojuegos-49zj2nvzc-israel-s-projects-a3827549.vercel.app', // URL de producción
  /^https:\/\/catalogo-videojuegos.*\.vercel\.app$/ // Comodín para previews de Vercel
];

app.use(cors({
    origin: allowedOrigins, 
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        for (let o of allowedOrigins) {
            if (o instanceof RegExp && o.test(origin)) return callback(null, true);
            if (o === origin) return callback(null, true);
        }
        // Si llega aquí, imprime en los logs de Render quién intentó entrar
        console.log("CORS Bloqueado para el origen:", origin);
        return callback(new Error('Bloqueado por CORS: ' + origin), false);
    },
    credentials: true 
}));
app.use(express.json());

// Verificación de variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ERROR FATAL: Faltan las credenciales de Supabase en el archivo .env");
    process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// CONFIGURACIÓN DE SUBIDA DE IMÁGENES (Supabase Storage)
// ==========================================
const IMAGE_BUCKET = 'game-images';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (permitidos.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.'));
  }
});

// Extrae la ruta interna del bucket a partir de una URL pública de Supabase Storage
function extraerPathDesdeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marca = `/${IMAGE_BUCKET}/`;
  const idx = url.indexOf(marca);
  if (idx === -1) return null;
  return url.substring(idx + marca.length);
}

// Construye la URL pública a partir de la ruta guardada en image_path.
// Si el valor ya es una URL (datos antiguos), la devuelve tal cual.
function publicUrlDesdePath(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(pathOrUrl);
  return data?.publicUrl || '';
}

// El frontend siempre espera `image_url`, pero la BD solo tiene `image_path`.
// Agregamos ese campo a la respuesta sin escribirlo en la tabla.
function conUrlPublica(juego) {
  if (!juego) return juego;
  return { ...juego, image_url: publicUrlDesdePath(juego.image_path || juego.image_url) };
}

// Quita `image_url` del payload: esa columna no existe en la BD real.
function soloColumnasReales(body) {
  const { image_url, ...resto } = body || {};
  return resto;
}

// Elimina una imagen del Storage a partir de su path o URL (silencioso ante errores)
async function eliminarImagenStorage(pathOrUrl) {
  if (!pathOrUrl) return;
  const path = pathOrUrl.startsWith('http') ? extraerPathDesdeUrl(pathOrUrl) : pathOrUrl;
  if (!path) return;
  try {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) console.error('Error al eliminar imagen del Storage:', error.message);
  } catch (e) {
    console.error('Error inesperado al eliminar imagen:', e.message);
  }
}

// ==========================================
// VARIABLES WEBAUTHN (Actualizadas para puerto 8100)
// ==========================================
const rpName = 'GameStore';
const currentChallenges = {}; 

// Helper para configurar WebAuthn dinámicamente para Vercel y Localhost
function getWebAuthnConfig(req) {
  const origin = req.headers.origin;
  if (origin && origin.includes('vercel.app')) {
      const originUrl = new URL(origin);
      return {
          rpID: originUrl.hostname,
          expectedOrigins: [origin]
      };
  }
  return {
      rpID: 'localhost',
      expectedOrigins: ['http://localhost:8100', 'http://localhost:4200']
  };
}

// ==========================================
// 1. Catálogo de Juegos (CRUD COMPLETO)
// ==========================================
// Campos que realmente usa el catálogo móvil. Antes se hacía SELECT * y se
// enviaban columnas innecesarias (image_path vacío, is_active, created_at...).
const CATALOG_FIELDS = 'id,title,description,price,discount_percentage,platform,category,image_path,stock';

app.get('/api/videogames', async (req, res) => {
  try {
      // Filtros opcionales: ?platform=PC&category=AVENTURA&search=zelda
      // Paginación opcional: ?limit=10&offset=0
      const { platform, category, search } = req.query;
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

      let query = supabase.from('videogames')
        .select(CATALOG_FIELDS)
        .eq('is_active', true);

      if (platform) query = query.eq('platform', String(platform));
      if (category) query = query.eq('category', String(category));
      if (search) query = query.ilike('title', `%${String(search)}%`);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      res.setHeader('X-Page-Limit', String(limit));
      res.setHeader('X-Page-Offset', String(offset));
      res.json((data || []).map(conUrlPublica));
  } catch (error) {
      console.error("Error al obtener catálogo:", error.message);
      res.status(500).json({ error: error.message });
  }
});

// Subir imagen al Supabase Storage y devolver su URL pública + ruta interna
app.post('/api/videogames/upload', upload.single('image'), async (req, res) => {
  try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

      const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `games/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fileName);
      res.json({ image_url: publicUrlData.publicUrl, image_path: fileName });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/videogames', async (req, res) => {
  try {
      const payload = soloColumnasReales(req.body);
      const { data, error } = await supabase.from('videogames').insert([payload]).select();
      if (error) throw error;
      res.json(conUrlPublica(data[0]));
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.put('/api/videogames/:id', async (req, res) => {
  const { id } = req.params;
  try {
      // Obtenemos la imagen anterior para borrarla si se reemplaza
      const { data: anterior } = await supabase
        .from('videogames')
        .select('image_path, image_url')
        .eq('id', id)
        .single();

      const payload = soloColumnasReales(req.body);
      const { data, error } = await supabase.from('videogames').update(payload).eq('id', id).select();
      if (error) throw error;

      // Si cambió la imagen, eliminamos la anterior del Storage
      const nuevaImagen = payload.image_path || req.body.image_url;
      const imagenAnterior = anterior?.image_path || anterior?.image_url;
      if (nuevaImagen && imagenAnterior && nuevaImagen !== imagenAnterior) {
        await eliminarImagenStorage(imagenAnterior);
      }

      res.json(conUrlPublica(data[0]));
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/videogames/:id', async (req, res) => {
  const { id } = req.params;
  try {
      // Obtenemos la imagen antes de eliminar el registro
      const { data: anterior } = await supabase
        .from('videogames')
        .select('image_path, image_url')
        .eq('id', id)
        .single();

      const { error } = await supabase.from('videogames').delete().eq('id', id);
      if (error) throw error;

      // Eliminamos la imagen asociada del Storage
      await eliminarImagenStorage(anterior?.image_path || anterior?.image_url);

      res.json({ message: 'Juego eliminado correctamente' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Baja lógica de un videojuego
app.patch('/api/videogames/:id/logical-delete', async (req, res) => {
  const { id } = req.params;
  try {
      const { error } = await supabase.from('videogames')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      res.json({ message: 'Juego dado de baja (inactivo)' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Detalle por id. Antes no existía y la app recibía 404 al abrir un juego
// desde un enlace profundo. Consulta con índice primario y proyección.
app.get('/api/videogames/:id', async (req, res) => {
  try {
      const { data, error } = await supabase
        .from('videogames')
        .select(CATALOG_FIELDS)
        .eq('id', req.params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Juego no encontrado' });
      res.json(conUrlPublica(data));
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1.5 Gestión de Usuarios (Admin)
// ==========================================

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

      // Bloquear acceso a usuarios dados de baja
      if (profile?.is_active === false) {
          return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
      }

      res.json({ user: data.user, profile: profile || {}, session: data.session });
  } catch (error) {
      res.status(401).json({ error: error.message });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
      // Traemos TODOS (activos e inactivos) para que el admin vea el estado
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      // Obtenemos la fecha de último inicio de sesión desde Auth
      let mapLogin = new Map();
      try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          (authUsers?.users || []).forEach(u => {
              if (u.id) mapLogin.set(u.id, u.last_sign_in_at || null);
          });
      } catch (e) {
          console.error("Error al obtener last_sign_in_at:", e.message);
      }

      const usuarios = (data || []).map(p => ({ ...p, last_sign_in_at: mapLogin.get(p.id) || null }));
      res.json(usuarios);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { email, password, full_name, rol, phone_number } = req.body;
  try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true 
      });

      if (authError) throw authError;

      // Usamos upsert para evitar error 500 si Supabase ya creó el perfil automáticamente con un Trigger
      const { data: profileData, error: profileError } = await supabase.from('profiles').upsert([{
        id: authData.user.id,
        email: email,
        full_name: full_name,
        rol: rol || 'cliente',
        phone_number: phone_number
      }]).select();

      if (profileError) throw profileError;

      res.json(profileData[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Guardar secreto 2FA
app.post('/api/users/:id/2fa', async (req, res) => {
  const { id } = req.params;
  const { secret } = req.body;
  try {
      const { data, error } = await supabase.from('profiles').update({ two_factor_secret: secret }).eq('id', id).select();
      if (error) throw error;
      res.json(data[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Resetear 2FA (Admin)
app.post('/api/users/:id/reset-2fa', async (req, res) => {
  const { id } = req.params;
  try {
      const { data, error } = await supabase.from('profiles').update({ two_factor_secret: null }).eq('id', id).select();
      if (error) throw error;
      res.json({ message: '2FA reseteado correctamente' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, rol, phone_number } = req.body;
  try {
      const { data, error } = await supabase.from('profiles').update({
        full_name, rol, phone_number
      }).eq('id', id).select();

      if (error) throw error;
      res.json(data[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ message: 'Usuario eliminado' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Baja lógica de un usuario
app.patch('/api/users/:id/logical-delete', async (req, res) => {
  const { id } = req.params;
  try {
      const { error } = await supabase.from('profiles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      res.json({ message: 'Usuario dado de baja (inactivo)' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Reactivar un usuario
app.patch('/api/users/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
      const { error } = await supabase.from('profiles')
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
      res.json({ message: 'Usuario reactivado' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. Carrito de Compras (Sync con Supabase)
// ==========================================
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, videogames(*)')
        .eq('user_id', userId);
        
      if (error) throw error;
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart', async (req, res) => {
  const { user_id, videogame_id, quantity } = req.body;
  
  if (!user_id || !videogame_id || quantity === undefined) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
      if (quantity <= 0) {
        const { error } = await supabase.from('cart_items').delete().match({ user_id, videogame_id });
        if (error) throw error;
        return res.json({ message: 'Item removido' });
      }

      const { data, error } = await supabase
        .from('cart_items')
        .upsert({ user_id, videogame_id, quantity }, { onConflict: 'user_id, videogame_id' })
        .select();
        
      if (error) throw error;
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
      if (error) throw error;
      res.json({ message: 'Carrito vaciado exitosamente' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. WebAuthn (Huella Digital)
// ==========================================

app.post('/api/biometrics/generate-registration-options', async (req, res) => {
  const { email, user_id } = req.body;
  const { rpID } = getWebAuthnConfig(req);
  try {
      const options = await generateRegistrationOptions({
        rpName, rpID, userID: new Uint8Array(Buffer.from(user_id)), userName: email, attestationType: 'none', // rpID dinámico
        authenticatorSelection: { 
          authenticatorAttachment: 'platform', 
          residentKey: 'required', 
          userVerification: 'required' 
        },
      });
      currentChallenges[user_id] = options.challenge;
      res.json(options);
  } catch (error) {
      console.error("Error en generateRegistrationOptions:", error);
      res.status(500).json({ error: 'Error al generar opciones: ' + error.message });
  }
});

app.post('/api/biometrics/verify-registration', async (req, res) => {
  const { user_id, registrationResponse } = req.body;
  const expectedChallenge = currentChallenges[user_id];
  if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expirado' });

  const { rpID, expectedOrigins } = getWebAuthnConfig(req);

  try {
    const verification = await verifyRegistrationResponse({
      response: registrationResponse, 
      expectedChallenge, 
      expectedOrigin: expectedOrigins, // dinámico
      expectedRPID: rpID, // dinámico
    });

    if (verification.verified) {
      const { registrationInfo } = verification;
      const { error } = await supabase.from('webauthn_credentials').insert([{
        user_id, 
        credential_id: registrationInfo.credential.id,
        public_key: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
        counter: registrationInfo.credential.counter || 0,
        device_type: req.headers['user-agent'] || 'Navegador Web'
      }]);
      if (error) throw error;
      
      delete currentChallenges[user_id];
      return res.json({ verified: true });
    }
  } catch (error) {
    console.error("Error en verifyRegistrationResponse:", error);
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});

app.post('/api/biometrics/generate-authentication-options', async (req, res) => {
  const { user_id } = req.body;
  const { rpID } = getWebAuthnConfig(req);
  try {
      // Bloquear usuarios dados de baja
      const { data: perfil, error: perfilErr } = await supabase.from('profiles').select('is_active').eq('id', user_id).single();
      if (perfilErr) throw perfilErr;
      if (perfil?.is_active === false) {
          return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
      }

      const { data: credentials, error } = await supabase.from('webauthn_credentials').select('*').eq('user_id', user_id);
      if (error || !credentials.length) return res.status(404).json({ error: 'Sin credenciales biométricas.' });

      const options = await generateAuthenticationOptions({
        rpID, // dinámico
        allowCredentials: credentials.map(c => ({ id: c.credential_id, type: 'public-key' })),
        userVerification: 'required',
      });
      currentChallenges[user_id] = options.challenge;
      res.json(options);
  } catch (error) {
      console.error("Error en generateAuthenticationOptions:", error);
      res.status(500).json({ error: 'Error al generar opciones: ' + error.message });
  }
});

// === INICIO MIS COMPRAS / PAGOS (inyectado por asistente) ===

// 3. Pagos / Compras (Checkout + Historial) — sincronizado con Supabase
app.post('/api/pago', async (req, res) => {
  const { user_id, items } = req.body; // items: [{ gameId, quantity }]
  if (!user_id || !Array.isArray(items)) return res.status(400).json({ error: 'Datos de compra incompletos' });

  try {
    // Evita compras duplicadas: borra el carrito del usuario antes de crear la orden.
    const del = await supabase.from('cart_items').delete().eq('user_id', user_id);
    if (del.error) throw del.error;

    const gameRows = [];
    let totalAmount = 0;
    for (const it of items) {
      if (!it || !it.gameId) continue;
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const { data: gdata } = await supabase.from('videogames').select('*').eq('id', it.gameId).maybeSingle();
      if (!gdata) continue; // sin stock / desactivado -> se omite el item
      const priceAtPurchase = Number(gdata.price) || 0;
      totalAmount += priceAtPurchase * qty;
      gameRows.push({ videogame_id: gdata.id, quantity: qty, price_at_purchase: priceAtPurchase });
    }

    if (gameRows.length === 0) return res.status(400).json({ error: 'Ningún juego disponible para comprar' });

    const now = new Date();
    // .select() devuelve un ARRAY de filas insertadas, no un objeto suelto.
    // Hay que tomar [0]; si se usa `orderData.id` directamente sale undefined
    // y los order_items quedan huérfanos (sin order_id).
    const { data: orderData, error: oErr } = await supabase.from('orders').insert([
      { user_id, total_amount: totalAmount, status: 'COMPLETED', payment_method: 'BIOMETRIC', created_at: now, is_active: true },
    ]).select();
    if (oErr) throw oErr;
    const insertedOrder = Array.isArray(orderData) ? orderData[0] : orderData;
    if (!insertedOrder?.id) throw new Error('No se pudo crear la orden');

    const { error: iErr } = await supabase.from('order_items').insert(
      gameRows.map(r => ({ ...r, order_id: insertedOrder.id })),
    );
    if (iErr) throw iErr;

    console.log(`✅ Compra registrada para ${user_id}: total $${totalAmount}, ${gameRows.length} item(s)`);
    return res.json({ success: true, orderId: insertedOrder.id, total_amount: totalAmount });
  } catch (e) {
    console.error('Error en /api/pago:', e);
    return res.status(500).json({ error: e.message || 'Error procesando compra' });
  }
});

app.get('/api/orders/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, videogames(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data ?? []);
  } catch (e) {
    console.error('Error en /api/orders/:userId:', e);
    return res.status(500).json({ error: e.message || 'Error al cargar órdenes' });
  }
});
app.post('/api/biometrics/verify-authentication', async (req, res) => {
  const { user_id, authenticationResponse } = req.body;
  const expectedChallenge = currentChallenges[user_id];
  if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expirado' });

  const { rpID, expectedOrigins } = getWebAuthnConfig(req);

  try {
      // Bloquear usuarios dados de baja
      const { data: perfil, error: perfilErr } = await supabase.from('profiles').select('is_active').eq('id', user_id).single();
      if (perfilErr) throw perfilErr;
      if (perfil?.is_active === false) {
          return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
      }

      const { data: credentials } = await supabase.from('webauthn_credentials').select('*').eq('user_id', user_id);
      const credential = credentials.find(c => c.credential_id === authenticationResponse.id);
      if (!credential) return res.status(400).json({ error: 'Credencial no encontrada.' });

      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse, 
        expectedChallenge, 
        expectedOrigin: expectedOrigins, // dinámico
        expectedRPID: rpID, // dinámico
        credential: {
          id: credential.credential_id,
          publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64')),
          counter: credential.counter,
        },
      });

      if (verification.verified) {
        await supabase.from('webauthn_credentials').update({ counter: verification.authenticationInfo.newCounter || 0 }).eq('credential_id', credential.credential_id);
        delete currentChallenges[user_id];
        return res.json({ verified: true });
      }
  } catch (error) {
    console.error("Error en verifyAuthenticationResponse:", error);
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});

// Rutas base
app.get('/', (req, res) => { res.send('🎮 API de GameStore funcionando al 100%'); });
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) throw error;
        res.json({ status: 'Éxito', mensaje: '🚀 ¡Conexión a Supabase establecida!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`👉 Prueba de BD en: http://localhost:${PORT}/api/test-db\n`);
});