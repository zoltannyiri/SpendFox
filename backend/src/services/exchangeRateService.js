const API_BASE_URL = 'https://api.frankfurter.dev/v2';
const TARGET_CURRENCY = 'HUF';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const rateCache = new Map();

const normalizeCurrency = (currency) =>
  String(currency || TARGET_CURRENCY).trim().toUpperCase();

const getCachedRate = (currency) => {
  const cachedRate = rateCache.get(currency);

  if (!cachedRate) {
    return null;
  }

  if (Date.now() - cachedRate.cachedAt > CACHE_TTL_MS) {
    rateCache.delete(currency);
    return null;
  }

  return cachedRate;
};

const getRateToHuf = async (currencyValue) => {
  const currency = normalizeCurrency(currencyValue);

  if (currency === TARGET_CURRENCY) {
    return {
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      base: TARGET_CURRENCY,
      target: TARGET_CURRENCY,
    };
  }

  const cachedRate = getCachedRate(currency);

  if (cachedRate) {
    return cachedRate;
  }

  const response = await fetch(`${API_BASE_URL}/rate/${currency}/${TARGET_CURRENCY}`);

  if (!response.ok) {
    throw new Error(`Exchange rate request failed for ${currency}/${TARGET_CURRENCY}`);
  }

  const data = await response.json();
  const rate = Number(data.rate);

  if (!rate || Number.isNaN(rate)) {
    throw new Error(`Missing exchange rate for ${currency}/${TARGET_CURRENCY}`);
  }

  const nextRate = {
    rate,
    date: data.date || new Date().toISOString().slice(0, 10),
    base: currency,
    target: TARGET_CURRENCY,
    cachedAt: Date.now(),
  };

  rateCache.set(currency, nextRate);

  return nextRate;
};

const convertPriceToHuf = async (priceValue, currencyValue) => {
  const price = Number(priceValue);

  if (Number.isNaN(price)) {
    return {
      price_huf: null,
      exchange_rate_to_huf: null,
      exchange_rate_date: null,
    };
  }

  const exchangeRate = await getRateToHuf(currencyValue);

  return {
    price_huf: Math.round(price * exchangeRate.rate),
    exchange_rate_to_huf: exchangeRate.rate,
    exchange_rate_date: exchangeRate.date,
  };
};

module.exports = {
  convertPriceToHuf,
  getRateToHuf,
};
