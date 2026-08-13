const { listFeedActivities } = require('../services/profileActivityService');

const getFeed = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { limit, scope } = req.query;
    const { data, error } = await listFeedActivities(uid, { limit, scope });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getFeed,
};
