const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { areFriends } = require('./friendService');
const { getUserById } = require('./userService');

const subscriptionsCollection = db.collection('subscriptions');
const shareInvitesCollection = db.collection('subscription_share_invites');

const toNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  return value;
};

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const snapshotToInvite = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

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
    profile_slug: user.profile_slug,
  };
};

const getSubscriptionOrThrow = async (subscriptionId) => {
  const doc = await subscriptionsCollection.doc(String(subscriptionId)).get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  return {
    id: Number(doc.id) || doc.id,
    ...doc.data(),
  };
};

const enrichInvite = async (invite) => {
  const [ownerResult, receiverResult, subscription] = await Promise.all([
    getUserById(invite.owner_user_id),
    getUserById(invite.receiver_id),
    getSubscriptionOrThrow(invite.subscription_id),
  ]);

  return {
    ...invite,
    owner: sanitizeUser(ownerResult.data),
    receiver: sanitizeUser(receiverResult.data),
    subscription,
  };
};

const listSubscriptionInvites = async (subscriptionId) => {
  const snapshot = await shareInvitesCollection
    .where('subscription_id', '==', String(subscriptionId))
    .get();

  return snapshot.docs.map(snapshotToInvite);
};

const getAcceptedParticipantIds = (subscription, invites) => {
  const ids = new Set([String(subscription.user_id)]);

  invites
    .filter((invite) => invite.status === 'accepted')
    .forEach((invite) => ids.add(String(invite.receiver_id)));

  return [...ids];
};

const getPriceInHuf = (subscription) => {
  const convertedPrice = Number(subscription.price_huf);

  if (!Number.isNaN(convertedPrice)) {
    return convertedPrice;
  }

  if ((subscription.currency || 'HUF') === 'HUF') {
    return Number(subscription.price) || 0;
  }

  return 0;
};

const buildParticipants = async (subscription, invites) => {
  const acceptedInvites = invites.filter((invite) => invite.status === 'accepted');
  const fixedInviteShares = acceptedInvites
    .map((invite) => Number(invite.share_price_huf))
    .filter((value) => !Number.isNaN(value) && value >= 0);
  const fixedTotal = fixedInviteShares.reduce((total, value) => total + value, 0);
  const totalPriceHuf = getPriceInHuf(subscription);
  const flexibleParticipantCount =
    1 + acceptedInvites.filter((invite) => Number.isNaN(Number(invite.share_price_huf))).length;
  const flexibleShareHuf = Math.max(totalPriceHuf - fixedTotal, 0) / Math.max(flexibleParticipantCount, 1);
  const ownerResult = await getUserById(subscription.user_id);
  const participants = [
    {
      user_id: toNumericId(subscription.user_id),
      status: 'accepted',
      is_owner: true,
      share_price_huf: flexibleShareHuf,
      custom_share_price_huf: null,
      has_custom_share: false,
      user: sanitizeUser(ownerResult.data),
    },
  ];
  const invitedParticipants = await Promise.all(
    acceptedInvites.map(async (invite) => {
      const userResult = await getUserById(invite.receiver_id);
      const fixedShare = Number(invite.share_price_huf);

      return {
        invite_id: invite.id,
        user_id: toNumericId(invite.receiver_id),
        status: 'accepted',
        is_owner: false,
        share_price_huf: Number.isNaN(fixedShare) ? flexibleShareHuf : fixedShare,
        custom_share_price_huf: Number.isNaN(fixedShare) ? null : fixedShare,
        has_custom_share: !Number.isNaN(fixedShare),
        settlement_status: invite.settlement_status || 'pending',
        settlement_note: invite.settlement_note || '',
        settled_at: invite.settled_at || null,
        user: sanitizeUser(userResult.data),
      };
    })
  );
  participants.push(...invitedParticipants);
  const pendingParticipants = await Promise.all(
    invites
      .filter((invite) => invite.status === 'pending')
      .map(async (invite) => {
        const userResult = await getUserById(invite.receiver_id);

        return {
          invite_id: invite.id,
          user_id: toNumericId(invite.receiver_id),
          status: 'pending',
          is_owner: false,
          share_price_huf: Number(invite.share_price_huf) || 0,
          custom_share_price_huf: Number.isNaN(Number(invite.share_price_huf))
            ? null
            : Number(invite.share_price_huf),
          has_custom_share: !Number.isNaN(Number(invite.share_price_huf)),
          settlement_status: invite.settlement_status || 'pending',
          settlement_note: invite.settlement_note || '',
          settled_at: invite.settled_at || null,
          user: sanitizeUser(userResult.data),
        };
      })
  );

  return [...participants, ...pendingParticipants];
};

const enrichSubscriptionWithShare = async (subscription, viewerId = null) => {
  const invites = await listSubscriptionInvites(subscription.id);
  const acceptedParticipantIds = getAcceptedParticipantIds(subscription, invites);
  const participants = await buildParticipants(subscription, invites);
  const myParticipant = participants.find((participant) => String(participant.user_id) === String(viewerId));
  const mySharePriceHuf = viewerId && acceptedParticipantIds.includes(String(viewerId))
    ? myParticipant?.share_price_huf || 0
    : getPriceInHuf(subscription);

  return {
    ...subscription,
    is_shared: subscription.is_shared || invites.length > 0,
    owner_user_id: subscription.owner_user_id || subscription.user_id,
    participants,
    accepted_participant_count: acceptedParticipantIds.length,
    my_share_price_huf: mySharePriceHuf,
  };
};

const getSubscriptionShareAccess = async (currentUserId, subscriptionId) => {
  const subscription = await getSubscriptionOrThrow(subscriptionId);

  if (String(subscription.user_id) === String(currentUserId)) {
    return {
      subscription,
      role: 'owner',
      canAccess: true,
    };
  }

  const inviteSnapshot = await shareInvitesCollection
    .where('subscription_id', '==', String(subscriptionId))
    .where('receiver_id', '==', String(currentUserId))
    .get();
  const acceptedInvite = inviteSnapshot.docs
    .map(snapshotToInvite)
    .find((invite) => invite.status === 'accepted');

  return {
    subscription,
    role: acceptedInvite ? 'participant' : null,
    invite: acceptedInvite || null,
    canAccess: Boolean(acceptedInvite),
  };
};

const listUserShareInvites = async (currentUserId) => {
  try {
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      shareInvitesCollection
        .where('receiver_id', '==', String(currentUserId))
        .get(),
      shareInvitesCollection
        .where('owner_user_id', '==', String(currentUserId))
        .get(),
    ]);

    const incoming = await Promise.all(
      incomingSnapshot.docs
        .map(snapshotToInvite)
        .filter((invite) => invite.status === 'pending')
        .map(enrichInvite)
    );
    const outgoing = await Promise.all(
      outgoingSnapshot.docs
        .map(snapshotToInvite)
        .filter((invite) => invite.status === 'pending')
        .map(enrichInvite)
    );

    return { data: { incoming, outgoing }, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const inviteSubscriptionParticipant = async (currentUserId, subscriptionId, receiverId, options = {}) => {
  try {
    const subscription = await getSubscriptionOrThrow(subscriptionId);
    const normalizedCurrentUserId = String(currentUserId);
    const normalizedReceiverId = String(receiverId);

    if (String(subscription.user_id) !== normalizedCurrentUserId) {
      return { data: null, error: { message: 'Only the owner can share this subscription' } };
    }

    if (normalizedCurrentUserId === normalizedReceiverId) {
      return { data: null, error: { message: 'You cannot invite yourself' } };
    }

    const isFriend = await areFriends(normalizedCurrentUserId, normalizedReceiverId);

    if (!isFriend) {
      return { data: null, error: { message: 'You can only invite friends' } };
    }

    const existingSnapshot = await shareInvitesCollection
      .where('subscription_id', '==', String(subscriptionId))
      .where('receiver_id', '==', normalizedReceiverId)
      .get();
    const existingPendingOrAccepted = existingSnapshot.docs
      .map(snapshotToInvite)
      .find((invite) => ['pending', 'accepted'].includes(invite.status));

    if (existingPendingOrAccepted) {
      return { data: await enrichInvite(existingPendingOrAccepted), error: null };
    }

    const id = await getNextId('subscription_share_invites');
    const inviteRef = shareInvitesCollection.doc(String(id));
    const sharePriceHuf = Number(options.share_price_huf);
    const invite = {
      id,
      subscription_id: String(subscriptionId),
      owner_user_id: normalizedCurrentUserId,
      receiver_id: normalizedReceiverId,
      status: 'pending',
      ...(Number.isNaN(sharePriceHuf) ? {} : { share_price_huf: sharePriceHuf }),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.runTransaction(async (transaction) => {
      transaction.set(inviteRef, invite);
      transaction.update(subscriptionsCollection.doc(String(subscriptionId)), {
        is_shared: true,
        owner_user_id: toNumericId(normalizedCurrentUserId),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const doc = await inviteRef.get();

    return { data: await enrichInvite(snapshotToInvite(doc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const updateSubscriptionShareParticipant = async (currentUserId, subscriptionId, participantUserId, fields = {}) => {
  try {
    const subscription = await getSubscriptionOrThrow(subscriptionId);

    if (String(subscription.user_id) === String(participantUserId)) {
      return { data: null, error: { message: 'Owner share is calculated automatically' } };
    }

    const inviteSnapshot = await shareInvitesCollection
      .where('subscription_id', '==', String(subscriptionId))
      .where('receiver_id', '==', String(participantUserId))
      .get();
    const inviteDoc = inviteSnapshot.docs
      .map((doc) => ({ doc, invite: snapshotToInvite(doc) }))
      .find(({ invite }) => ['pending', 'accepted'].includes(invite.status));

    if (!inviteDoc) {
      return { data: null, error: { message: 'Share participant not found' } };
    }

    const isOwner = String(subscription.user_id) === String(currentUserId);
    const isOwnParticipantRecord = String(participantUserId) === String(currentUserId);
    const onlySettlementFields = Object.keys(fields).every((field) =>
      ['settlement_status', 'settlement_note'].includes(field)
    );

    if (!isOwner && (!isOwnParticipantRecord || !onlySettlementFields)) {
      return { data: null, error: { message: 'Only the owner can update shares; participants can update their own settlement status' } };
    }

    const payload = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (Object.prototype.hasOwnProperty.call(fields, 'share_price_huf')) {
      if (!isOwner) {
        return { data: null, error: { message: 'Only the owner can update share amounts' } };
      }

      const sharePriceHuf = Number(fields.share_price_huf);

      if (fields.share_price_huf === null || fields.share_price_huf === '') {
        payload.share_price_huf = admin.firestore.FieldValue.delete();
      } else if (!Number.isNaN(sharePriceHuf) && sharePriceHuf >= 0) {
        payload.share_price_huf = sharePriceHuf;
      } else {
        return { data: null, error: { message: 'share_price_huf must be a positive number' } };
      }
    }

    if (Object.prototype.hasOwnProperty.call(fields, 'settlement_status')) {
      if (!['pending', 'settled'].includes(fields.settlement_status)) {
        return { data: null, error: { message: 'settlement_status must be pending or settled' } };
      }

      payload.settlement_status = fields.settlement_status;
      payload.settled_at = fields.settlement_status === 'settled'
        ? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.delete();
    }

    if (Object.prototype.hasOwnProperty.call(fields, 'settlement_note')) {
      payload.settlement_note = String(fields.settlement_note || '').trim().slice(0, 500);
    }

    await inviteDoc.doc.ref.update(payload);
    const updatedDoc = await inviteDoc.doc.ref.get();

    return { data: await enrichInvite(snapshotToInvite(updatedDoc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const removeSubscriptionShareParticipant = async (currentUserId, subscriptionId, participantUserId) => {
  try {
    const subscription = await getSubscriptionOrThrow(subscriptionId);

    if (String(subscription.user_id) !== String(currentUserId)) {
      return { data: null, error: { message: 'Only the owner can remove participants' } };
    }

    if (String(subscription.user_id) === String(participantUserId)) {
      return { data: null, error: { message: 'Owner cannot be removed from own subscription' } };
    }

    const inviteSnapshot = await shareInvitesCollection
      .where('subscription_id', '==', String(subscriptionId))
      .where('receiver_id', '==', String(participantUserId))
      .get();
    const inviteDoc = inviteSnapshot.docs
      .map((doc) => ({ doc, invite: snapshotToInvite(doc) }))
      .find(({ invite }) => ['pending', 'accepted'].includes(invite.status));

    if (!inviteDoc) {
      return { data: null, error: { message: 'Share participant not found' } };
    }

    await inviteDoc.doc.ref.update({
      status: inviteDoc.invite.status === 'pending' ? 'revoked' : 'removed',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const remainingSnapshot = await shareInvitesCollection
      .where('subscription_id', '==', String(subscriptionId))
      .get();
    const hasRemainingShares = remainingSnapshot.docs
      .map(snapshotToInvite)
      .some((invite) => ['pending', 'accepted'].includes(invite.status));

    if (!hasRemainingShares) {
      await subscriptionsCollection.doc(String(subscriptionId)).update({
        is_shared: false,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const updatedDoc = await inviteDoc.doc.ref.get();

    return { data: await enrichInvite(snapshotToInvite(updatedDoc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const respondToSubscriptionShareInvite = async (currentUserId, inviteId, action) => {
  try {
    if (!['accept', 'decline'].includes(action)) {
      return { data: null, error: { message: 'Invalid share invite action' } };
    }

    const inviteRef = shareInvitesCollection.doc(String(inviteId));
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return { data: null, error: { message: 'Share invite not found' } };
    }

    const invite = snapshotToInvite(inviteDoc);

    if (String(invite.receiver_id) !== String(currentUserId)) {
      return { data: null, error: { message: 'You cannot respond to this invite' } };
    }

    if (invite.status !== 'pending') {
      return { data: null, error: { message: 'Share invite is not pending' } };
    }

    await inviteRef.update({
      status: action === 'accept' ? 'accepted' : 'declined',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await inviteRef.get();

    return { data: await enrichInvite(snapshotToInvite(updatedDoc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  enrichSubscriptionWithShare,
  getSubscriptionShareAccess,
  inviteSubscriptionParticipant,
  listUserShareInvites,
  removeSubscriptionShareParticipant,
  respondToSubscriptionShareInvite,
  updateSubscriptionShareParticipant,
};
