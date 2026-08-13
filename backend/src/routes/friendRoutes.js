const express = require('express');
const {
  acceptFriendRequest,
  createFriendRequest,
  deleteFriend,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  searchFriendUsers,
} = require('../controllers/friendController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/friends/search', requireAuth, searchFriendUsers);
router.get('/friends/requests', requireAuth, getFriendRequests);
router.get('/friends', requireAuth, getFriends);
router.post('/friends/requests', requireAuth, createFriendRequest);
router.patch('/friends/requests/:id/accept', requireAuth, acceptFriendRequest);
router.patch('/friends/requests/:id/reject', requireAuth, rejectFriendRequest);
router.delete('/friends/:id', requireAuth, deleteFriend);

module.exports = router;
