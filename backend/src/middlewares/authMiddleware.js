const { admin } = require('../services/firestoreClient');

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [type, token] = authorizationHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    req.auth = await admin.auth().verifyIdToken(token);

    return next();
  } catch (err) {
    console.log('[auth] verifyIdToken failed:', {
      code: err.code,
      message: err.message,
    });

    return res.status(401).json({
      error: 'Invalid bearer token',
      details: err.message,
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return next();
    }

    req.auth = await admin.auth().verifyIdToken(token);

    return next();
  } catch (err) {
    console.log('[auth] optional verifyIdToken failed:', {
      code: err.code,
      message: err.message,
    });

    return next();
  }
};

module.exports = {
  optionalAuth,
  requireAuth,
};
