const { admin, db } = require('./firestoreClient');
const { firebaseWebApiKey } = require('../config/env');
const { getNextId } = require('./counterService');
const { ensureUsernameAvailable } = require('./userService');

const toAuthError = (err) => ({
  message: err.message || 'Authentication failed',
});

const registerWithEmail = async ({ email, password, fullName, username, avatar_url }) => {
  try {
    const usernameAvailability = await ensureUsernameAvailable(username);

    if (usernameAvailability.error) {
      return {
        data: null,
        error: usernameAvailability.error,
        appUser: null,
        appUserError: null,
      };
    }

    const normalizedUsername = usernameAvailability.username;
    const nextUserId = await getNextId('users');
    const uid = String(nextUserId);

    const user = await admin.auth().createUser({
      uid,
      email,
      password,
      displayName: fullName,
      ...(avatar_url ? { photoURL: avatar_url } : {}),
    });

    const appUserPayload = {
      id: nextUserId,
      email: user.email,
      full_name: fullName || null,
      username: normalizedUsername || null,
      username_lower: normalizedUsername || null,
      avatar_url: avatar_url || null,
      public_profile_enabled: true,
      profile_visibility: 'public',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(user.uid).set(appUserPayload);

    const appUserSnapshot = await db.collection('users').doc(user.uid).get();
    const customToken = await admin.auth().createCustomToken(user.uid);
    const loginResult = await loginWithEmail({ email, password });

    return {
      data: {
        user: loginResult.data?.user || {
          id: nextUserId,
          email: user.email,
          user_metadata: {
            full_name: fullName || null,
            username: normalizedUsername || null,
            avatar_url: avatar_url || null,
          },
        },
        session: loginResult.data?.session || null,
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

    if (!appUserSnapshot.exists) {
      return {
        data: null,
        error: {
          message: 'User profile not found',
        },
      };
    }

    const appUser = appUserSnapshot.data();

    return {
      data: {
        user: {
          id: appUser?.id || Number(user.uid) || user.uid,
          email: user.email,
          user_metadata: {
            full_name: appUser?.full_name || user.displayName || null,
            username: appUser?.username || null,
            avatar_url: appUser?.avatar_url || user.photoURL || null,
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

const refreshSession = async ({ refreshToken }) => {
  if (!firebaseWebApiKey) {
    return {
      data: null,
      error: {
        message: 'Missing FIREBASE_WEB_API_KEY from .env file for token refresh',
      },
    };
  }

  if (!refreshToken) {
    return {
      data: null,
      error: {
        message: 'Refresh token is required',
      },
    };
  }

  try {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${firebaseWebApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: result.error?.message || 'Token refresh failed',
        },
      };
    }

    return {
      data: {
        session: {
          access_token: result.id_token,
          refresh_token: result.refresh_token,
          expires_in: Number(result.expires_in),
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
  refreshSession,
};
