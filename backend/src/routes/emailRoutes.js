const express = require('express');
const { sendTest } = require('../controllers/emailController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/email/test', requireAuth, sendTest);

module.exports = router;
