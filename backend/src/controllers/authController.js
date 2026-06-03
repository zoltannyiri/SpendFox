const { registerWithEmail, loginWithEmail } = require('../services/authService');

const register = async (req, res) => {
  try {
    const { email, password, full_name, username } = req.body;

    console.log('[auth.register] email:', JSON.stringify(email));

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error, profile, profileError } = await registerWithEmail({
      email,
      password,
      fullName: full_name,
      username,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (profileError) {
      return res.status(500).json({
        error: 'User created, but profile insert failed',
        details: profileError.message,
        data,
      });
    }

    return res.status(201).json({ data, profile });
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

module.exports = {
  register,
  login,
};
