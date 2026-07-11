const express = require('express');
const {
	getSubscriptions,
	getSubscription,
	createSubscription,
	updateSubscription,
	deleteSubscription,
	refreshExchangeRates,
} = require('../controllers/subscriptionController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions/exchange-rates/refresh', requireAuth, refreshExchangeRates);
router.get('/subscriptions/:id', getSubscription);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

module.exports = router;
