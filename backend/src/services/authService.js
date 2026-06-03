const supabase = require('./supabaseClient');

const registerWithEmail = async ({ email, password, fullName, username }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username,
      },
    },
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || !data.user) {
    return { data, error: null, profile: null };
  }

  const profilePayload = {
    id: data.user.id,
    full_name: fullName,
    username,
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single();

  return { data, error: null, profile, profileError };
};

const loginWithEmail = async ({ email, password }) => {
  return supabase.auth.signInWithPassword({ email, password });
};

module.exports = {
  registerWithEmail,
  loginWithEmail,
};
