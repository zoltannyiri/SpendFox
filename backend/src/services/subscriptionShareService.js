const crypto = require('crypto');
const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { areFriends } = require('./friendService');
const { getUserById } = require('./userService');
const { sendPushToUser } = require('./pushTokenService');

const subscriptionsCollection = db.collection('subscriptions');
const shareInvitesCollection = db.collection('subscription_share_invites');
const shareLinksCollection = db.collection('subscription_share_links');

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

const snapshotToShareLink = (doc) => ({
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
    const enrichedInvite = await enrichInvite(snapshotToInvite(doc));

    sendShareInvitePush(enrichedInvite).catch((err) => {
      console.log('[push] failed to send shared invite notification:', err?.message || err);
    });

    return { data: enrichedInvite, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const sendShareInvitePush = async (invite) => {
  if (!invite?.receiver_id) {
    return;
  }

  const ownerName =
    invite?.owner?.full_name ||
    invite?.owner?.username ||
    invite?.owner?.email ||
    'Valaki';
  const subscriptionName = invite?.subscription?.name || 'közös előfizetés';

  await sendPushToUser({
    uid: invite.receiver_id,
    title: 'Új közös előfizetés meghívó',
    body: `${ownerName} meghívott: ${subscriptionName}`,
    data: {
      type: 'subscription_share_invite',
      subscriptionId: String(invite.subscription_id || ''),
      inviteId: String(invite.id || ''),
    },
  });
};

const getOrCreateSubscriptionShareLink = async (currentUserId, subscriptionId) => {
  try {
    const subscription = await getSubscriptionOrThrow(subscriptionId);

    if (String(subscription.user_id) !== String(currentUserId)) {
      return { data: null, error: { message: 'Only the owner can create share links' } };
    }

    const existingSnapshot = await shareLinksCollection
      .where('subscription_id', '==', String(subscriptionId))
      .get();
    const existingLink = existingSnapshot.docs
      .map(snapshotToShareLink)
      .find((link) => String(link.owner_user_id) === String(currentUserId) && link.active === true);

    if (existingLink) {
      return { data: existingLink, error: null };
    }

    const id = await getNextId('subscription_share_links');
    const token = crypto.randomBytes(24).toString('hex');
    const shareLink = {
      id,
      token,
      subscription_id: String(subscriptionId),
      owner_user_id: String(currentUserId),
      active: true,
      used_count: 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await shareLinksCollection.doc(String(id)).set(shareLink);

    return { data: shareLink, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const getSubscriptionShareLinkPreview = async (currentUserId, token) => {
  try {
    const linkSnapshot = await shareLinksCollection
      .where('token', '==', String(token))
      .limit(1)
      .get();

    const link = linkSnapshot.empty ? null : snapshotToShareLink(linkSnapshot.docs[0]);

    if (!link || link.active !== true) {
      return { data: null, error: { message: 'Share link not found' } };
    }

    const subscription = await getSubscriptionOrThrow(link.subscription_id);
    const ownerResult = await getUserById(link.owner_user_id);
    const access = await getSubscriptionShareAccess(currentUserId, subscription.id);

    return {
      data: {
        token: link.token,
        role: access.role,
        can_access: access.canAccess,
        already_joined: access.canAccess,
        subscription: {
          id: subscription.id,
          name: subscription.name,
          billing_cycle: subscription.billing_cycle,
          price_huf: getPriceInHuf(subscription),
          currency: subscription.currency,
          category: subscription.category,
          logo_url: subscription.logo_url,
        },
        owner: sanitizeUser(ownerResult.data),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const joinSubscriptionShareLink = async (currentUserId, token) => {
  try {
    const linkSnapshot = await shareLinksCollection
      .where('token', '==', String(token))
      .limit(1)
      .get();

    const linkDoc = linkSnapshot.empty ? null : linkSnapshot.docs[0];
    const link = linkDoc ? snapshotToShareLink(linkDoc) : null;

    if (!link || link.active !== true) {
      return { data: null, error: { message: 'Share link not found' } };
    }

    const subscription = await getSubscriptionOrThrow(link.subscription_id);

    if (String(subscription.user_id) === String(currentUserId)) {
      const enrichedSubscription = await enrichSubscriptionWithShare(subscription, currentUserId);

      return {
        data: {
          subscription: enrichedSubscription,
          role: 'owner',
          already_joined: true,
        },
        error: null,
      };
    }

    const existingSnapshot = await shareInvitesCollection
      .where('subscription_id', '==', String(subscription.id))
      .where('receiver_id', '==', String(currentUserId))
      .get();
    const existingInviteDoc = existingSnapshot.docs
      .map((doc) => ({ doc, invite: snapshotToInvite(doc) }))
      .find(({ invite }) => ['pending', 'accepted'].includes(invite.status));
    const alreadyJoined = existingInviteDoc?.invite?.status === 'accepted';

    if (existingInviteDoc) {
      if (!alreadyJoined) {
        await existingInviteDoc.doc.ref.update({
          status: 'accepted',
          invite_type: 'link',
          link_token: link.token,
          accepted_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      const inviteId = await getNextId('subscription_share_invites');
      await shareInvitesCollection.doc(String(inviteId)).set({
        id: inviteId,
        subscription_id: String(subscription.id),
        owner_user_id: String(subscription.user_id),
        receiver_id: String(currentUserId),
        status: 'accepted',
        invite_type: 'link',
        link_token: link.token,
        settlement_status: 'pending',
        accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await db.runTransaction(async (transaction) => {
      transaction.update(subscriptionsCollection.doc(String(subscription.id)), {
        is_shared: true,
        owner_user_id: toNumericId(subscription.user_id),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(linkDoc.ref, {
        ...(alreadyJoined ? {} : { used_count: admin.firestore.FieldValue.increment(1) }),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const enrichedSubscription = await enrichSubscriptionWithShare(subscription, currentUserId);

    return {
      data: {
        subscription: enrichedSubscription,
        role: 'participant',
        already_joined: alreadyJoined,
      },
      error: null,
    };
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
  getOrCreateSubscriptionShareLink,
  getSubscriptionShareLinkPreview,
  inviteSubscriptionParticipant,
  joinSubscriptionShareLink,
  listUserShareInvites,
  removeSubscriptionShareParticipant,
  respondToSubscriptionShareInvite,
  updateSubscriptionShareParticipant,
};
