const {
  createActivityComment,
  createProfileActivity,
  getProfileActivityById,
  listActivityComments,
  listProfileActivities,
  toggleActivityLike,
  toggleActivitySave,
} = require('../services/profileActivityService');

const getProfileActivities = async (req, res) => {
  try {
    const viewerId = req.auth?.uid;
    const { userId } = req.params;
    const { limit } = req.query;
    const { data, error, meta } = await listProfileActivities(viewerId, userId, { limit });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data, meta });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createActivity = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { data, error } = await createProfileActivity(userId, req.body);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getActivity = async (req, res) => {
  try {
    const viewerId = req.auth?.uid;
    const { activityId } = req.params;
    const { data, error, status } = await getProfileActivityById(viewerId, activityId);

    if (error) {
      return res.status(status || 400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const likeActivity = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { activityId } = req.params;
    const { data, error } = await toggleActivityLike(userId, activityId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const saveActivity = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { activityId } = req.params;
    const { data, error } = await toggleActivitySave(userId, activityId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getActivityComments = async (req, res) => {
  try {
    const viewerId = req.auth?.uid;
    const { activityId } = req.params;
    const { limit } = req.query;
    const { data, error } = await listActivityComments(viewerId, activityId, { limit });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createComment = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { activityId } = req.params;
    const { data, error } = await createActivityComment(userId, activityId, req.body);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  createActivity,
  createComment,
  getActivity,
  getActivityComments,
  getProfileActivities,
  likeActivity,
  saveActivity,
};
