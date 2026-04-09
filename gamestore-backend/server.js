require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
app.get('/api/videogames', async (req, res) => {
  try {
      const { data, error } = await supabase.from('videogames').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
  } catch (error) {
      console.error("Error al obtener catálogo:", error.message);
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/videogames', async (req, res) => {
  try {
      const { data, error } = await supabase.from('videogames').insert([req.body]).select();
      if (error) throw error;
      res.json(data[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.put('/api/videogames/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const { data, error } = await supabase.from('videogames').update(req.body).eq('id', id).select();
      if (error) throw error;
      res.json(data[0]);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/videogames/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const { error } = await supabase.from('videogames').delete().eq('id', id);
      if (error) throw error;
      res.json({ message: 'Juego eliminado correctamente' });
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
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      res.json(data);
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

app.post('/api/biometrics/verify-authentication', async (req, res) => {
  const { user_id, authenticationResponse } = req.body;
  const expectedChallenge = currentChallenges[user_id];
  if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expirado' });

  const { rpID, expectedOrigins } = getWebAuthnConfig(req);

  try {
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