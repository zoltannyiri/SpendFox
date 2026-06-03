const { admin, db } = require('./firestoreClient');
const { firebaseWebApiKey } = require('../config/env');
const { getNextId } = require('./counterService');

const toAuthError = (err) => ({
  message: err.message || 'Authentication failed',
});

const registerWithEmail = async ({ email, password, fullName, username }) => {
  try {
    const nextUserId = await getNextId('users');
    const uid = String(nextUserId);

    const user = await admin.auth().createUser({
      uid,
      email,
      password,
      displayName: fullName,
    });

    const appUserPayload = {
      id: nextUserId,
      email: user.email,
      full_name: fullName || null,
      username: username || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(user.uid).set(appUserPayload);

    const appUserSnapshot = await db.collection('users').doc(user.uid).get();
    const customToken = await admin.auth().createCustomToken(user.uid);

    return {
      data: {
        user: {
          id: nextUserId,
          email: user.email,
          user_metadata: {
            full_name: fullName || null,
            username: username || null,
          },
        },
        session: null,
        customToken,
      },
      error: null,
      appUser: appUserSnapshot.data(),
      appUserError: null,
    };
  } catch (err) {
    return { data: null, error: toAuthError(err), appUser: null, appUserError: null };
  }
};

const loginWithEmail = async ({ email, password }) => {
  if (!firebaseWebApiKey) {
    return {
      data: null,
      error: {
        message: 'Missing FIREBASE_WEB_API_KEY from .env file for password login',
      },
    };
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: result.error?.message || 'Invalid email or password',
        },
      };
    }

    const user = await admin.auth().getUser(result.localId);
    const appUserSnapshot = await db.collection('users').doc(user.uid).get();
    const appUser = appUserSnapshot.exists ? appUserSnapshot.data() : null;

    return {
      data: {
        user: {
          id: appUser?.id || Number(user.uid) || user.uid,
          email: user.email,
          user_metadata: {
            full_name: appUser?.full_name || user.displayName || null,
            username: appUser?.username || null,
          },
        },
        session: {
          access_token: result.idToken,
          refresh_token: result.refreshToken,
          expires_in: Number(result.expiresIn),
        },
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toAuthError(err) };
  }
};

module.exports = {
  registerWithEmail,
  loginWithEmail,
};
