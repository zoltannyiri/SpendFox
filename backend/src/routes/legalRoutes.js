const express = require('express');
const { deleteAccount, privacy, terms } = require('../controllers/legalController');

const router = express.Router();

router.get('/legal/privacy', privacy);
router.get('/legal/terms', terms);
router.get('/legal/delete-account', deleteAccount);

module.exports = router;
