const express = require('express');
const { register, sendTest } = require('../controllers/pushController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/push/register', requireAuth, register);
router.post('/push/test', requireAuth, sendTest);

module.exports = router;
