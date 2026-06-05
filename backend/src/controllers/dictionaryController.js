const { listDictionaryItems } = require('../services/dictionaryService');

const getDictionary = async (req, res) => {
  try {
    const { type } = req.params;
    const { data, error } = await listDictionaryItems(type);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getDictionary,
};
