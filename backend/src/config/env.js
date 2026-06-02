require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const port = process.env.PORT ? Number(process.env.PORT) : 5000;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const parseJwtRole = (token) => {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    const json = JSON.parse(decoded);
    return json.role || 'unknown';
  } catch (err) {
    return 'unknown';
  }
};

const role = parseJwtRole(supabaseServiceRoleKey);
console.log(`[env] SUPABASE_URL loaded: ${Boolean(supabaseUrl)}`);
console.log(`[env] SUPABASE_SERVICE_ROLE_KEY role: ${role}`);

module.exports = {
  supabaseUrl,
  supabaseServiceRoleKey,
  port,
};
