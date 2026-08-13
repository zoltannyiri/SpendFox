const express = require('express');
const {
  createActivity,
  createComment,
  getActivity,
  getActivityComments,
  getProfileActivities,
  likeActivity,
  saveActivity,
} = require('../controllers/profileActivityController');
const { optionalAuth, requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/profile-activities', requireAuth, createActivity);
router.get('/profile-activities/show/:activityId', optionalAuth, getActivity);
router.get('/profile-activities/:userId', optionalAuth, getProfileActivities);
router.post('/profile-activities/:activityId/like', requireAuth, likeActivity);
router.post('/profile-activities/:activityId/save', requireAuth, saveActivity);
router.get('/profile-activities/:activityId/comments', requireAuth, getActivityComments);
router.post('/profile-activities/:activityId/comments', requireAuth, createComment);

module.exports = router;
