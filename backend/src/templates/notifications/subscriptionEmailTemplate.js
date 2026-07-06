const buildSubscriptionEmail = ({ user, subscription, daysBefore }) => {
  const name = subscription?.name || 'előfizetés';
  const price = subscription?.price;
  const currency = subscription?.currency || 'HUF';
  const amount = price === undefined || price === null ? '' : ` (${price} ${currency})`;

  return {
    subject: `Közelgő előfizetés: ${name}`,
    text: [
      `Szia ${user?.full_name || user?.username || ''}!`.trim(),
      '',
      `${daysBefore} nap múlva esedékes a(z) ${name}${amount} előfizetésed.`,
      '',
      'SpendFox',
    ].join('\n'),
    html: `
      <p>Szia ${user?.full_name || user?.username || ''}!</p>
      <p><strong>${daysBefore} nap múlva</strong> esedékes a(z) <strong>${name}</strong>${amount} előfizetésed.</p>
      <p>SpendFox</p>
    `,
  };
};

module.exports = {
  buildSubscriptionEmail,
};
