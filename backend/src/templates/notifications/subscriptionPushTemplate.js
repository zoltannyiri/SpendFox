const formatAmount = (subscription) => {
  const price = subscription?.price;
  const currency = subscription?.currency || 'HUF';

  if (price === undefined || price === null || price === '') {
    return '';
  }

  return `${Number(price).toLocaleString('hu-HU')} ${currency}`;
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('hu-HU', {
    month: 'long',
    day: 'numeric',
  });
};

const buildSubscriptionPushNotification = ({
  subscription,
  daysBefore,
  billingDate,
  reminderType = 'billing',
}) => {
  const name = subscription?.name || 'előfizetés';
  const amount = formatAmount(subscription);
  const dateText = formatDate(billingDate);
  const whenText = Number(daysBefore) === 0 ? 'ma' : `${daysBefore} nap múlva`;
  const amountText = amount ? `, ${amount}` : '';
  const dateSuffix = dateText ? ` (${dateText})` : '';
  const isTrial = reminderType === 'trial';

  return {
    title: isTrial ? `${name} próbaidő lejár` : `${name} fizetés közeleg`,
    body: isTrial
      ? `${whenText} lejár a próbaidő${dateSuffix}.`
      : `${whenText} esedékes${dateSuffix}${amountText}.`,
    data: {
      type: isTrial ? 'trial_reminder' : 'subscription_reminder',
      subscriptionId: String(subscription?.id || ''),
      daysBefore: String(daysBefore),
      billingDate: billingDate ? new Date(billingDate).toISOString().slice(0, 10) : '',
      reminderType,
    },
  };
};

module.exports = {
  buildSubscriptionPushNotification,
};
