const express = require('express');
const { getUsers, getUser, deleteUser } = require('../controllers/userController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/users', getUsers);
router.get('/users/:id', optionalAuth, getUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
