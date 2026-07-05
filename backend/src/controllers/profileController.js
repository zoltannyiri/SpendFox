const { getUserByUid, updateUserByUid } = require('../services/userService');

const getProfile = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data, error } = await getUserByUid(uid);

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { email, full_name, username, avatar_url } = req.body;

    const payload = {
      email,
      full_name,
      username,
      avatar_url,
    };

    const { data, error } = await updateUserByUid(uid, payload);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
