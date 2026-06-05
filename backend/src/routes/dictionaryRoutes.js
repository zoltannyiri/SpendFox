const express = require('express');
const { getDictionary } = require('../controllers/dictionaryController');

const router = express.Router();

router.get('/dictionary/:type', getDictionary);

module.exports = router;
