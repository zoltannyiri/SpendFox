const express = require('express');
const { getProfile, updateProfile, deleteProfile } = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);
router.delete('/profile', requireAuth, deleteProfile);

module.exports = router;
