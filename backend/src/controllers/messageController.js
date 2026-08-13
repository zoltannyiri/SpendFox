const {
  getMessagesWithUser,
  sendMessage,
} = require('../services/messageService');
const { emitMessageCreated } = require('../services/socketService');

const getConversationMessages = async (req, res) => {
  try {
    const currentUserId = req.auth?.uid;
    const { userId } = req.params;
    const { data, error } = await getMessagesWithUser(currentUserId, userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createMessage = async (req, res) => {
  try {
    const currentUserId = req.auth?.uid;
    const { userId } = req.params;
    const { body } = req.body;
    const { data, error } = await sendMessage(currentUserId, userId, body);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    emitMessageCreated(data.message);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  createMessage,
  getConversationMessages,
};
