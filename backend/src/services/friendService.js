const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');

const usersCollection = db.collection('users');
const friendRequestsCollection = db.collection('friend_requests');
const friendsCollection = db.collection('friends');

const toUser = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const toFriendRequest = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const toFriend = (doc) => ({
  id: doc.id,
  ...doc.data(),
});

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const getPairKey = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join('_');

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    avatar_url: user.avatar_url,
    bio: user.bio,
    location: user.location,
    profile_slug: user.profile_slug,
  };
};

const getUserOrThrow = async (userId) => {
  const doc = await usersCollection.doc(String(userId)).get();

  if (!doc.exists) {
    throw new Error('User not found');
  }

  return toUser(doc);
};

const enrichRequest = async (request) => {
  const [sender, receiver] = await Promise.all([
    getUserOrThrow(request.sender_id),
    getUserOrThrow(request.receiver_id),
  ]);

  return {
    ...request,
    sender: sanitizeUser(sender),
    receiver: sanitizeUser(receiver),
  };
};

const searchUsers = async (currentUserId, query) => {
  try {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    if (normalizedQuery.length < 2) {
      return { data: [], error: null };
    }

    const snapshot = await usersCollection.get();
    const users = snapshot.docs
      .filter((doc) => doc.id !== '_schema' && doc.id !== String(currentUserId))
      .map(toUser)
      .filter((user) => {
        const searchable = [
          user.email,
          user.full_name,
          user.username,
          user.profile_slug,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .slice(0, 10)
      .map(sanitizeUser);

    return { data: users, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const listFriends = async (currentUserId) => {
  try {
    const snapshot = await friendsCollection
      .where('user_ids', 'array-contains', String(currentUserId))
      .get();

    const friends = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const friendship = toFriend(doc);
        const friendId = friendship.user_ids.find((id) => id !== String(currentUserId));
        const friend = await getUserOrThrow(friendId);

        return {
          ...friendship,
          friend: sanitizeUser(friend),
        };
      })
    );

    return { data: friends, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const listFriendRequests = async (currentUserId) => {
  try {
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      friendRequestsCollection
        .where('receiver_id', '==', String(currentUserId))
        .get(),
      friendRequestsCollection
        .where('sender_id', '==', String(currentUserId))
        .get(),
    ]);

    const incoming = await Promise.all(
      incomingSnapshot.docs
        .map((doc) => toFriendRequest(doc))
        .filter((request) => request.status === 'pending')
        .map((request) => enrichRequest(request))
    );
    const outgoing = await Promise.all(
      outgoingSnapshot.docs
        .map((doc) => toFriendRequest(doc))
        .filter((request) => request.status === 'pending')
        .map((request) => enrichRequest(request))
    );

    return { data: { incoming, outgoing }, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const sendFriendRequest = async (senderId, receiverId) => {
  try {
    const normalizedSenderId = String(senderId);
    const normalizedReceiverId = String(receiverId);

    if (normalizedSenderId === normalizedReceiverId) {
      return { data: null, error: { message: 'You cannot add yourself as a friend' } };
    }

    await Promise.all([
      getUserOrThrow(normalizedSenderId),
      getUserOrThrow(normalizedReceiverId),
    ]);

    const pairKey = getPairKey(normalizedSenderId, normalizedReceiverId);
    const friendship = await friendsCollection.doc(pairKey).get();

    if (friendship.exists) {
      return { data: null, error: { message: 'Users are already friends' } };
    }

    const existingRequestSnapshot = await friendRequestsCollection
      .where('pair_key', '==', pairKey)
      .get();

    const existingRequestDoc = existingRequestSnapshot.docs.find((doc) => {
      const request = toFriendRequest(doc);
      return request.status === 'pending';
    });

    if (existingRequestDoc) {
      const existingRequest = toFriendRequest(existingRequestDoc);
      return { data: await enrichRequest(existingRequest), error: null };
    }

    const id = await getNextId('friend_requests');
    const requestRef = friendRequestsCollection.doc(String(id));
    const request = {
      id,
      pair_key: pairKey,
      sender_id: normalizedSenderId,
      receiver_id: normalizedReceiverId,
      status: 'pending',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await requestRef.set(request);

    const doc = await requestRef.get();

    return { data: await enrichRequest(toFriendRequest(doc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const respondToFriendRequest = async (currentUserId, requestId, action) => {
  try {
    const requestRef = friendRequestsCollection.doc(String(requestId));
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return { data: null, error: { message: 'Friend request not found' } };
    }

    const request = toFriendRequest(requestDoc);

    if (request.receiver_id !== String(currentUserId)) {
      return { data: null, error: { message: 'You cannot respond to this request' } };
    }

    if (request.status !== 'pending') {
      return { data: null, error: { message: 'Friend request is not pending' } };
    }

    if (!['accept', 'reject'].includes(action)) {
      return { data: null, error: { message: 'Invalid friend request action' } };
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    const friendshipRef = friendsCollection.doc(request.pair_key);

    await db.runTransaction(async (transaction) => {
      transaction.update(requestRef, {
        status: nextStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (action === 'accept') {
        transaction.set(friendshipRef, {
          user_ids: [request.sender_id, request.receiver_id],
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    const updatedRequest = await requestRef.get();

    return { data: await enrichRequest(toFriendRequest(updatedRequest)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const removeFriend = async (currentUserId, friendId) => {
  try {
    const pairKey = getPairKey(currentUserId, friendId);
    const friendshipRef = friendsCollection.doc(pairKey);
    const friendship = await friendshipRef.get();

    if (!friendship.exists) {
      return { data: null, error: { message: 'Friendship not found' } };
    }

    await friendshipRef.delete();

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  listFriends,
  listFriendRequests,
  removeFriend,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
};
