const buildSubscriptionPushNotification = ({ subscription, daysBefore }) => {
  const name = subscription?.name || 'előfizetés';
  const price = subscription?.price;
  const currency = subscription?.currency || 'HUF';
  const amount = price === undefined || price === null ? '' : ` (${price} ${currency})`;

  return {
    title: 'Közelgő előfizetés',
    body: `${daysBefore} nap múlva esedékes: ${name}${amount}.`,
    data: {
      type: 'subscription_reminder',
      subscriptionId: String(subscription?.id || ''),
      daysBefore: String(daysBefore),
    },
  };
};

module.exports = {
  buildSubscriptionPushNotification,
};
