const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceRoleKey } = require('../config/env');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = supabase;
