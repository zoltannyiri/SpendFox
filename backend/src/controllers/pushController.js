const { registerPushToken, sendPushToUser } = require('../services/pushTokenService');

const register = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { pushToken, platform } = req.body;

    const { data, error } = await registerPushToken({
      uid,
      pushToken,
      platform,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const sendTest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { title, body, data } = req.body;

    const { data: result, error } = await sendPushToUser({
      uid,
      title,
      body,
      data,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  register,
  sendTest,
};
