const express = require('express');
const {
	getSubscriptions,
	getSubscription,
	createSubscription,
	updateSubscription,
	deleteSubscription,
	refreshExchangeRates,
	getSubscriptionShareInvites,
	inviteSubscriptionShare,
	removeSubscriptionShare,
	getSubscriptionShareOverview,
	respondToSubscriptionShare,
	getSubscriptionShareMessages,
	sendSubscriptionShareMessage,
	updateSubscriptionShare,
} = require('../controllers/subscriptionController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions/exchange-rates/refresh', requireAuth, refreshExchangeRates);
router.get('/subscriptions/share-invites', requireAuth, getSubscriptionShareInvites);
router.post('/subscriptions/share-invites/:inviteId/:action', requireAuth, respondToSubscriptionShare);
router.get('/subscriptions/:id/share/overview', requireAuth, getSubscriptionShareOverview);
router.post('/subscriptions/:id/share/invite', requireAuth, inviteSubscriptionShare);
router.get('/subscriptions/:id/share/messages', requireAuth, getSubscriptionShareMessages);
router.post('/subscriptions/:id/share/messages', requireAuth, sendSubscriptionShareMessage);
router.patch('/subscriptions/:id/share/participants/:participantUserId', requireAuth, updateSubscriptionShare);
router.delete('/subscriptions/:id/share/participants/:participantUserId', requireAuth, removeSubscriptionShare);
router.get('/subscriptions/:id', getSubscription);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

module.exports = router;
