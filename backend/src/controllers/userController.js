const { listUsers, getUserById } = require('../services/userService');


const getUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await listUsers(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getUserById(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getUsers,
  getUser,
};
