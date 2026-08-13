const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { getUserById, listUsers } = require('./userService');
const { areFriends, listFriends } = require('./friendService');
const { getSubscriptionById } = require('./subscriptionService');
const { resolveBrandLogoUrl } = require('./brandLogoService');

const activitiesCollection = db.collection('profile_activities');
const activityLikesCollection = db.collection('profile_activity_likes');
const activitySavesCollection = db.collection('profile_activity_saves');
const activityCommentsCollection = db.collection('profile_activity_comments');

const allowedTypes = new Set(['recommendation', 'tip', 'list', 'post', 'cancelled_subscription']);

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const toNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  return value;
};

const getTimestampMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  return new Date(value).getTime() || 0;
};

const snapshotToActivity = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const sanitizeActivityAuthor = (user) => ({
  id: user.id,
  full_name: user.full_name,
  username: user.username,
  avatar_url: user.avatar_url,
});

const getActivityReactionId = (activityId, userId) => `${String(activityId)}_${String(userId)}`;

const snapshotToComment = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const enrichActivitiesForViewer = async (viewerId, activities) => {
  if (!viewerId || activities.length === 0) {
    return activities;
  }

  const normalizedViewerId = toNumericId(viewerId);

  return Promise.all(
    activities.map(async (activity) => {
      const [likeDoc, saveDoc] = await Promise.all([
        activityLikesCollection.doc(getActivityReactionId(activity.id, normalizedViewerId)).get(),
        activitySavesCollection.doc(getActivityReactionId(activity.id, normalizedViewerId)).get(),
      ]);

      return {
        ...activity,
        viewer_liked: likeDoc.exists,
        viewer_saved: saveDoc.exists,
      };
    })
  );
};

const canViewActivities = async (viewerId, profileUser) => {
  const visibility = profileUser.profile_visibility || 'public';
  const isOwnProfile = viewerId && String(viewerId) === String(profileUser.id);

  if (isOwnProfile || visibility === 'public') {
    return true;
  }

  if (visibility === 'friends') {
    return areFriends(viewerId, profileUser.id);
  }

  return false;
};

const normalizeActivityPayload = (payload) => {
  const type = allowedTypes.has(payload.type) ? payload.type : 'post';
  const body = String(payload.body || '').trim();
  const title = String(payload.title || '').trim();
  const subscriptionName = String(payload.subscription_name || '').trim();
  const category = String(payload.category || '').trim();
  const subscriptionId = payload.subscription_id === undefined ? null : toNumericId(payload.subscription_id);
  const logoUrl = String(payload.logo_url || '').trim();
  const currency = String(payload.currency || '').trim();
  const billingCycle = String(payload.billing_cycle || '').trim();
  const price = payload.price === undefined ? null : Number(payload.price);
  const priceHuf = payload.price_huf === undefined ? null : Number(payload.price_huf);
  const listItems = Array.isArray(payload.list_items)
    ? payload.list_items
        .slice(0, 12)
        .map((item) => ({
          id: item.id === undefined ? null : toNumericId(item.id),
          name: String(item.name || '').trim(),
          category: String(item.category || '').trim() || null,
          logo_url: String(item.logo_url || '').trim() || null,
          price_huf: item.price_huf === undefined ? null : Number(item.price_huf),
          currency: String(item.currency || '').trim() || null,
          billing_cycle: String(item.billing_cycle || '').trim() || null,
        }))
        .filter((item) => item.name)
        .map((item) => ({
          ...item,
          price_huf: Number.isNaN(item.price_huf) ? null : item.price_huf,
        }))
    : [];

  return {
    type,
    body,
    title: title || null,
    subscription_name: subscriptionName || null,
    subscription_id: subscriptionId,
    category: category || null,
    logo_url: logoUrl || null,
    price: Number.isNaN(price) ? null : price,
    price_huf: Number.isNaN(priceHuf) ? null : priceHuf,
    currency: currency || null,
    billing_cycle: billingCycle || null,
    list_items: listItems,
  };
};

const buildRecommendationPayload = async (userId, payload) => {
  if (!payload.subscription_id) {
    return normalizeActivityPayload(payload);
  }

  const { data: subscription, error } = await getSubscriptionById(String(payload.subscription_id));

  if (error) {
    throw new Error(error.message);
  }

  if (String(subscription.user_id) !== String(userId)) {
    throw new Error('You can only recommend your own subscriptions');
  }

  return normalizeActivityPayload({
    ...payload,
    type: 'recommendation',
    title: payload.title || subscription.name,
    subscription_name: subscription.name,
    category: subscription.category,
    logo_url: subscription.logo_url || resolveBrandLogoUrl(subscription.name),
    price: subscription.price,
    price_huf: subscription.price_huf,
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
  });
};

const listProfileActivities = async (viewerId, profileUserId, options = {}) => {
  try {
    const { data: profileUser, error: userError } = await getUserById(profileUserId);

    if (userError) {
      return { data: null, error: userError };
    }

    const canView = await canViewActivities(viewerId, profileUser);

    if (!canView) {
      return { data: [], error: null, meta: { can_view: false } };
    }

    const snapshot = await activitiesCollection
      .where('user_id', '==', toNumericId(profileUser.id))
      .get();
    const limit = Math.max(Number(options.limit) || 20, 1);
    const activities = snapshot.docs
      .map(snapshotToActivity)
      .sort((first, second) => getTimestampMillis(second.created_at) - getTimestampMillis(first.created_at))
      .slice(0, limit);

    return { data: activities, error: null, meta: { can_view: true } };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const getProfileActivityById = async (viewerId, activityId) => {
  try {
    const activityDoc = await activitiesCollection.doc(String(activityId)).get();

    if (!activityDoc.exists) {
      return { data: null, error: { message: 'Activity not found' } };
    }

    const activity = snapshotToActivity(activityDoc);
    const { data: author, error: userError } = await getUserById(activity.user_id);

    if (userError) {
      return { data: null, error: userError };
    }

    const canView = await canViewActivities(viewerId, author);

    if (!canView) {
      return { data: null, error: { message: 'Activity is not visible' }, status: 403 };
    }

    const [enrichedActivity] = await enrichActivitiesForViewer(viewerId, [
      {
        ...activity,
        author: sanitizeActivityAuthor(author),
      },
    ]);

    return { data: enrichedActivity, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const getFeedUsersForScope = async (viewerId, scope) => {
  const normalizedViewerId = toNumericId(viewerId);
  const { data: currentUser, error: currentUserError } = await getUserById(normalizedViewerId);

  if (currentUserError) {
    throw new Error(currentUserError.message);
  }

  if (scope === 'discover') {
    const { data: users, error: usersError } = await listUsers();

    if (usersError) {
      throw new Error(usersError.message);
    }

    return (users || [])
      .filter((user) => {
        const visibility = user.profile_visibility || 'public';
        return visibility === 'public' || String(user.id) === String(normalizedViewerId);
      })
      .map(sanitizeActivityAuthor);
  }

  const { data: friends, error: friendsError } = await listFriends(normalizedViewerId);

  if (friendsError) {
    throw new Error(friendsError.message);
  }

  return [
    sanitizeActivityAuthor(currentUser),
    ...(friends || []).map((friendship) => friendship.friend).filter(Boolean),
  ];
};

const listFeedActivities = async (viewerId, options = {}) => {
  try {
    const normalizedViewerId = toNumericId(viewerId);
    const scope = options.scope === 'discover' ? 'discover' : 'for-you';
    const feedUsers = await getFeedUsersForScope(normalizedViewerId, scope);
    const feedUserMap = new Map(feedUsers.map((user) => [String(user.id), user]));
    const activitySnapshots = await Promise.all(
      feedUsers.map((user) =>
        activitiesCollection
          .where('user_id', '==', toNumericId(user.id))
          .get()
      )
    );
    const limit = Math.max(Number(options.limit) || 30, 1);
    const activities = activitySnapshots
      .flatMap((snapshot) => snapshot.docs.map(snapshotToActivity))
      .map((activity) => ({
        ...activity,
        author: feedUserMap.get(String(activity.user_id)) || null,
      }))
      .sort((first, second) => getTimestampMillis(second.created_at) - getTimestampMillis(first.created_at))
      .slice(0, limit);

    return { data: await enrichActivitiesForViewer(normalizedViewerId, activities), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const createProfileActivity = async (userId, payload) => {
  try {
    const normalizedUserId = toNumericId(userId);
    const normalizedPayload =
      payload.type === 'recommendation'
        ? await buildRecommendationPayload(normalizedUserId, payload)
        : normalizeActivityPayload(payload);

    if (normalizedPayload.type === 'list' && normalizedPayload.list_items.length === 0) {
      return {
        data: null,
        error: { message: 'At least one list item is required' },
      };
    }

    if (
      !normalizedPayload.body &&
      !normalizedPayload.title &&
      !normalizedPayload.subscription_name &&
      normalizedPayload.list_items.length === 0
    ) {
      return {
        data: null,
        error: { message: 'Activity content is required' },
      };
    }

    const id = await getNextId('profile_activities');
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = activitiesCollection.doc(String(id));

    await docRef.set({
      id,
      user_id: normalizedUserId,
      ...normalizedPayload,
      like_count: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
    });

    const doc = await docRef.get();

    return { data: snapshotToActivity(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const toggleActivityLike = async (userId, activityId) => {
  try {
    const normalizedUserId = toNumericId(userId);
    const activityRef = activitiesCollection.doc(String(activityId));
    const likeRef = activityLikesCollection.doc(getActivityReactionId(activityId, normalizedUserId));
    let liked = false;

    await db.runTransaction(async (transaction) => {
      const activityDoc = await transaction.get(activityRef);

      if (!activityDoc.exists) {
        throw new Error('Activity not found');
      }

      const likeDoc = await transaction.get(likeRef);

      if (likeDoc.exists) {
        transaction.delete(likeRef);
        transaction.update(activityRef, {
          like_count: admin.firestore.FieldValue.increment(-1),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        liked = false;
      } else {
        transaction.set(likeRef, {
          activity_id: toNumericId(activityId),
          user_id: normalizedUserId,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(activityRef, {
          like_count: admin.firestore.FieldValue.increment(1),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        liked = true;
      }
    });

    const updatedActivity = await activityRef.get();

    return {
      data: {
        liked,
        like_count: updatedActivity.data().like_count || 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const toggleActivitySave = async (userId, activityId) => {
  try {
    const normalizedUserId = toNumericId(userId);
    const activityDoc = await activitiesCollection.doc(String(activityId)).get();

    if (!activityDoc.exists) {
      return { data: null, error: { message: 'Activity not found' } };
    }

    const saveRef = activitySavesCollection.doc(getActivityReactionId(activityId, normalizedUserId));
    const saveDoc = await saveRef.get();
    const saved = !saveDoc.exists;

    if (saveDoc.exists) {
      await saveRef.delete();
    } else {
      await saveRef.set({
        activity_id: toNumericId(activityId),
        user_id: normalizedUserId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { data: { saved }, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const listActivityComments = async (viewerId, activityId, options = {}) => {
  try {
    const activityDoc = await activitiesCollection.doc(String(activityId)).get();

    if (!activityDoc.exists) {
      return { data: null, error: { message: 'Activity not found' } };
    }

    const snapshot = await activityCommentsCollection
      .where('activity_id', '==', toNumericId(activityId))
      .get();
    const limit = Math.max(Number(options.limit) || 50, 1);
    const comments = snapshot.docs
      .map(snapshotToComment)
      .sort((first, second) => getTimestampMillis(first.created_at) - getTimestampMillis(second.created_at))
      .slice(0, limit);
    const userIds = [...new Set(comments.map((comment) => String(comment.user_id)))];
    const users = await Promise.all(
      userIds.map(async (commentUserId) => {
        const { data } = await getUserById(commentUserId);
        return data;
      })
    );
    const userMap = new Map(
      users
        .filter(Boolean)
        .map((user) => [String(user.id), sanitizeActivityAuthor(user)])
    );

    return {
      data: comments.map((comment) => ({
        ...comment,
        author: userMap.get(String(comment.user_id)) || null,
      })),
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const createActivityComment = async (userId, activityId, payload) => {
  try {
    const body = String(payload.body || '').trim();

    if (!body) {
      return { data: null, error: { message: 'Comment body is required' } };
    }

    const normalizedUserId = toNumericId(userId);
    const activityRef = activitiesCollection.doc(String(activityId));
    const id = await getNextId('profile_activity_comments');
    const commentRef = activityCommentsCollection.doc(String(id));

    await db.runTransaction(async (transaction) => {
      const activityDoc = await transaction.get(activityRef);

      if (!activityDoc.exists) {
        throw new Error('Activity not found');
      }

      transaction.set(commentRef, {
        id,
        activity_id: toNumericId(activityId),
        user_id: normalizedUserId,
        body,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(activityRef, {
        comment_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const commentDoc = await commentRef.get();
    const { data: author } = await getUserById(normalizedUserId);

    return {
      data: {
        ...snapshotToComment(commentDoc),
        author: author ? sanitizeActivityAuthor(author) : null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  createActivityComment,
  createProfileActivity,
  getProfileActivityById,
  listActivityComments,
  listFeedActivities,
  listProfileActivities,
  toggleActivityLike,
  toggleActivitySave,
};
