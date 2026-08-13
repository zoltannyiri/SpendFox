const {
  listFriends,
  listFriendRequests,
  removeFriend,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
} = require('../services/friendService');

const getFriends = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data, error } = await listFriends(uid);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data, error } = await listFriendRequests(uid);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const searchFriendUsers = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { q } = req.query;
    const { data, error } = await searchUsers(uid, q);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createFriendRequest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { receiver_id } = req.body;
    const { data, error } = await sendFriendRequest(uid, receiver_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { id } = req.params;
    const { data, error } = await respondToFriendRequest(uid, id, 'accept');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { id } = req.params;
    const { data, error } = await respondToFriendRequest(uid, id, 'reject');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const deleteFriend = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { id } = req.params;
    const { data, error } = await removeFriend(uid, id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data, message: 'Friend removed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  acceptFriendRequest,
  createFriendRequest,
  deleteFriend,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  searchFriendUsers,
};
