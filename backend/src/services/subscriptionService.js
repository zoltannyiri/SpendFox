const supabase = require('./supabaseClient');

const listSubscriptions = async (userId) => {
  let query = supabase.from('subscriptions').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  return query.order('created_at', { ascending: false });
};

const createSubscription = async (payload) => {
  return supabase.from('subscriptions').insert(payload).select('*').single();
}

const deleteSubscription = async (id) => {
  return supabase.from('subscriptions').delete().eq('id', id);
}

const updateSubscription = async (id, payload) => {
  return supabase.from('subscriptions').update(payload).eq('id', id).select('*').single();
}

const getSubscriptionById = async (id) => {
  return supabase.from('subscriptions').select('*').eq('id', id).single();
}

module.exports = {
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  deleteSubscription,
  updateSubscription,
};
