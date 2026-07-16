const formatAmount = (subscription) => {
  const price = subscription?.price;
  const currency = subscription?.currency || 'HUF';

  if (price === undefined || price === null || price === '') {
    return 'nincs megadott ár';
  }

  return `${Number(price).toLocaleString('hu-HU')} ${currency}`;
};

const formatDate = (value) => {
  if (!value) {
    return 'nincs megadott dátum';
  }

  return new Date(value).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getBillingCycleLabel = (value) => {
  if (value === 'yearly') {
    return 'éves';
  }

  if (value === 'weekly') {
    return 'heti';
  }

  return 'havi';
};

const buildSubscriptionEmail = ({ user, subscription, daysBefore, billingDate }) => {
  const userName = user?.full_name || user?.username || 'Szia';
  const name = subscription?.name || 'előfizetés';
  const amount = formatAmount(subscription);
  const dateText = formatDate(billingDate);
  const cycle = getBillingCycleLabel(subscription?.billing_cycle);
  const whenText = Number(daysBefore) === 0 ? 'ma' : `${daysBefore} nap múlva`;

  return {
    subject: `SpendFox emlékeztető: ${name}`,
    text: [
      `Szia ${userName}!`,
      '',
      `A(z) ${name} előfizetésed ${whenText} esedékes.`,
      `Fizetési dátum: ${dateText}`,
      `Összeg: ${amount}`,
      `Számlázási ciklus: ${cycle}`,
      '',
      'SpendFox',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">SpendFox emlékeztető</h2>
        <p>Szia ${userName}!</p>
        <p>
          A(z) <strong>${name}</strong> előfizetésed
          <strong>${whenText}</strong> esedékes.
        </p>
        <div style="padding:14px 16px;border-radius:14px;background:#f3f5f8;margin:18px 0">
          <p style="margin:0 0 8px"><strong>Fizetési dátum:</strong> ${dateText}</p>
          <p style="margin:0 0 8px"><strong>Összeg:</strong> ${amount}</p>
          <p style="margin:0"><strong>Számlázási ciklus:</strong> ${cycle}</p>
        </div>
        <p style="color:#555">Ezt az értesítést a profil beállításaid alapján küldtük.</p>
        <p>SpendFox</p>
      </div>
    `,
  };
};

module.exports = {
  buildSubscriptionEmail,
};
