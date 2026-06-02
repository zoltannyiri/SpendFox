const express = require('express');
const {
	getSubscriptions,
	getSubscription,
	createSubscription,
	updateSubscription,
	deleteSubscription,
} = require('../controllers/subscriptionController');

const router = express.Router();

router.get('/subscriptions', getSubscriptions);
router.get('/subscriptions/:id', getSubscription);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

module.exports = router;
