const express = require('express');
const { getFeed } = require('../controllers/feedController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/feed', requireAuth, getFeed);

module.exports = router;
