const {listSubscriptions, getSubscriptionById, createSubscription: createSubscriptionRecord, 
    deleteSubscription: deleteSubscriptionRecord, updateSubscription: updateSubscriptionRecord} = require('../services/subscriptionService');

const getSubscriptions = async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await listSubscriptions(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getSubscriptionById(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createSubscription = async (req, res) => {
  try {
    const {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date,
      is_active,
    } = req.body;

    const payload = {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date,
      is_active,
    };

    const { data, error } = await createSubscriptionRecord(payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await deleteSubscriptionRecord(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: `Subscription with ID ${id} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date,
      is_active,
    } = req.body;

    const payload = {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date,
      is_active,
    };

    const { data, error } = await updateSubscriptionRecord(id, payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getSubscriptions,
  getSubscription,
  createSubscription,
  deleteSubscription,
  updateSubscription,
};
