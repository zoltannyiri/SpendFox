const express = require('express');
const {
  createMessage,
  getConversationMessages,
} = require('../controllers/messageController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/messages/:userId', requireAuth, getConversationMessages);
router.post('/messages/:userId', requireAuth, createMessage);

module.exports = router;
