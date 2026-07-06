const express = require('express');
const { register, sendTest, sendDelayedTest } = require('../controllers/pushController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/push/register', requireAuth, register);
router.post('/push/test', requireAuth, sendTest);
router.post('/push/test-delayed', requireAuth, sendDelayedTest);

module.exports = router;
