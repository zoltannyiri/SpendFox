const express = require('express');
const { getProfile } = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, getProfile);

module.exports = router;
