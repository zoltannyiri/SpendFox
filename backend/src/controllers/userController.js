const { listUsers, getUserById, deleteUserById } = require('../services/userService');
const { areFriends } = require('../services/friendService');

const publicProfileFields = [
  'id',
  'full_name',
  'username',
  'avatar_url',
  'bio',
  'location',
  'profile_slug',
  'profile_visibility',
  'created_at',
];

const pickFields = (data, fields) =>
  fields.reduce((result, field) => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }

    return result;
  }, {});

const getProfilePermission = async (viewerId, user) => {
  const visibility = user.profile_visibility || 'public';
  const isOwnProfile = viewerId && String(viewerId) === String(user.id);

  if (isOwnProfile) {
    return { canViewFullProfile: true, isOwnProfile: true, isFriend: true, visibility };
  }

  if (visibility === 'public') {
    return { canViewFullProfile: true, isOwnProfile: false, isFriend: false, visibility };
  }

  const isFriend = await areFriends(viewerId, user.id);

  return {
    canViewFullProfile: visibility === 'friends' && isFriend,
    isOwnProfile: false,
    isFriend,
    visibility,
  };
};


const getUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await listUsers(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getUserById(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const permission = await getProfilePermission(req.auth?.uid, data);
    const visibleData = permission.canViewFullProfile ? data : pickFields(data, publicProfileFields);

    return res.json({
      data: {
        ...visibleData,
        viewer_permissions: permission,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await deleteUserById(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: `User with ID ${id} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

module.exports = {
  getUsers,
  getUser,
  deleteUser
};
