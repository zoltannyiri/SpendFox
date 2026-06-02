const supabase = require('../services/supabaseClient');

const getHealth = async (req, res) => {
  const hasSupabase = Boolean(supabase);
  res.json({ status: 'ok', supabase: hasSupabase });
};

module.exports = { getHealth };
