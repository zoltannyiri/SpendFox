const { getUserByUid } = require('../services/userService');

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

module.exports = {
  getProfile,
};
