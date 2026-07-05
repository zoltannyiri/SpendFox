const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);

module.exports = router;
