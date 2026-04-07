// Importamos dotenv para leer el archivo .env
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Jalamos las variables de tu .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificamos que las variables existan para evitar errores raros
if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan las credenciales de Supabase en el archivo .env");
    process.exit(1);
}

// Creamos la conexión con "poderes de administrador"
const supabase = createClient(supabaseUrl, supabaseKey);

// Exportamos la conexión para usarla en el servidor
module.exports = supabase;