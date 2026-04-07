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

// Configuración de CORS más segura
app.use(cors({
    origin: ['http://localhost:4200', 'https://tu-dominio-vercel.app'], 
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

// Variables temporales para WebAuthn
const rpName = 'GameStore';
const rpID = 'localhost'; 
const origin = `http://${rpID}:4200`; 
const currentChallenges = {}; 

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

// Obtener todos los perfiles
app.get('/api/users', async (req, res) => {
  try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Crear usuario (Crea en Auth y en Profiles)
app.post('/api/users', async (req, res) => {
  const { email, password, full_name, rol, phone_number } = req.body;
  try {
      // 1. Crear en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Para que no pida confirmación por correo en desarrollo
      });

      if (authError) throw authError;

      // 2. Crear su perfil en public.profiles
      const { data: profileData, error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        email: email,
        full_name: full_name,
        rol: rol || 'cliente',
        phone_number: phone_number
      }]).select();

      if (profileError) throw profileError;

      res.json(profileData[0]);
  } catch (error) {
      console.error("Error creando usuario:", error.message);
      res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil de usuario
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

// Borrar usuario (De Auth y Profiles en cascada)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
      // Al borrarlo de Auth, tu regla ON DELETE CASCADE en Postgres lo borrará de Profiles
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ message: 'Usuario eliminado' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. Carrito de Compras (CRUD en cart_items)
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

app.delete('/api/cart/:userId/:videogameId', async (req, res) => {
  const { userId, videogameId } = req.params;
  try {
      const { error } = await supabase.from('cart_items').delete().match({ user_id: userId, videogame_id: videogameId });
      if (error) throw error;
      res.json({ message: 'Item removido' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
      if (error) throw error;
      res.json({ message: 'Carrito vaciado' });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Simulación de Compra
app.post('/api/orders', async (req, res) => {
  const { user_id, total } = req.body;
  if (!user_id || !total) return res.status(400).json({ error: 'Faltan datos de la orden' });

  try {
      const { data, error } = await supabase.from('orders').insert([{ user_id, total, status: 'completed' }]).select();
      if (error) throw error;

      await supabase.from('cart_items').delete().eq('user_id', user_id);
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. WebAuthn (Huella Digital)
// ==========================================

app.post('/api/biometrics/generate-registration-options', async (req, res) => {
  const { email, user_id } = req.body;
  try {
      const options = await generateRegistrationOptions({
        rpName, rpID, userID: new Uint8Array(Buffer.from(user_id)), userName: email, attestationType: 'none',
        authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      });
      currentChallenges[user_id] = options.challenge;
      res.json(options);
  } catch (error) {
      res.status(500).json({ error: 'Error al generar opciones de biometría' });
  }
});

app.post('/api/biometrics/verify-registration', async (req, res) => {
  const { user_id, registrationResponse } = req.body;
  const expectedChallenge = currentChallenges[user_id];
  if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expirado' });

  try {
    const verification = await verifyRegistrationResponse({
      response: registrationResponse, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID,
    });

    if (verification.verified) {
      const { registrationInfo } = verification;
      const { error } = await supabase.from('webauthn_credentials').insert([{
        user_id, credential_id: Buffer.from(registrationInfo.credential.id).toString('base64'),
        credential_public_key: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
        counter: registrationInfo.credential.counter
      }]);
      if (error) throw error;
      
      delete currentChallenges[user_id];
      return res.json({ verified: true });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});

app.post('/api/biometrics/generate-authentication-options', async (req, res) => {
  const { user_id } = req.body;
  try {
      const { data: credentials, error } = await supabase.from('webauthn_credentials').select('*').eq('user_id', user_id);
      if (error || !credentials.length) return res.status(404).json({ error: 'Sin credenciales biométricas.' });

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map(c => ({ id: new Uint8Array(Buffer.from(c.credential_id, 'base64')), type: 'public-key' })),
        userVerification: 'preferred',
      });
      currentChallenges[user_id] = options.challenge;
      res.json(options);
  } catch (error) {
      res.status(500).json({ error: 'Error al generar opciones' });
  }
});

app.post('/api/biometrics/verify-authentication', async (req, res) => {
  const { user_id, authenticationResponse } = req.body;
  const expectedChallenge = currentChallenges[user_id];
  if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expirado' });

  try {
      const { data: credentials } = await supabase.from('webauthn_credentials').select('*').eq('user_id', user_id);
      const credential = credentials.find(c => Buffer.from(c.credential_id, 'base64').toString('base64url') === authenticationResponse.id);
      if (!credential) return res.status(400).json({ error: 'Credencial no encontrada.' });

      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID,
        authenticator: {
          credentialID: new Uint8Array(Buffer.from(credential.credential_id, 'base64')),
          credentialPublicKey: new Uint8Array(Buffer.from(credential.credential_public_key, 'base64')),
          counter: credential.counter,
        },
      });

      if (verification.verified) {
        await supabase.from('webauthn_credentials').update({ counter: verification.authenticationInfo.newCounter }).eq('credential_id', credential.credential_id);
        delete currentChallenges[user_id];
        return res.json({ verified: true });
      }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});

// Rutas base
app.get('/', (req, res) => { res.send('🎮 API de GameStore funcionando al 100%'); });
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase.from('pg_stat_activity').select('*').limit(1);
        if (error) throw error;
        res.json({ status: 'Éxito', mensaje: '🚀 ¡Conexión a Supabase establecida!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`👉 Prueba de BD en: http://localhost:${PORT}/api/test-db\n`);
});