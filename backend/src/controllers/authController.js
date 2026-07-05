const { registerWithEmail, loginWithEmail, refreshSession } = require('../services/authService');

const register = async (req, res) => {
  try {
    const { email, password, full_name, username, avatar_url } = req.body;

    console.log('[auth.register] email:', JSON.stringify(email));

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error, appUser, appUserError } = await registerWithEmail({
      email,
      password,
      fullName: full_name,
      username,
      avatar_url: avatar_url || null,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (appUserError) {
      return res.status(500).json({
        error: 'User created, but app user insert failed',
        details: appUserError.message,
        data,
      });
    }

    return res.status(201).json({ data, appUser });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[auth.login] email:', JSON.stringify(email));

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await loginWithEmail({ email, password });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const { data, error } = await refreshSession({ refreshToken: refresh_token });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  register,
  login,
  refresh,
};
