const LOGO_SIZE = 128;

const brandDomains = {
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  skyshowtime: 'skyshowtime.com',
  sky: 'skyshowtime.com',
  youtube: 'youtube.com',
  'youtube premium': 'youtube.com',
  facebook: 'facebook.com',
  meta: 'meta.com',
  messenger: 'messenger.com',
  instagram: 'instagram.com',
  twitter: 'x.com',
  x: 'x.com',
  linkedin: 'linkedin.com',
  tiktok: 'tiktok.com',
  pinterest: 'pinterest.com',
  reddit: 'reddit.com',
  google: 'google.com',
  gmail: 'google.com',
  drive: 'google.com',
  'google drive': 'google.com',
  gemini: 'gemini.google.com',
  icloud: 'icloud.com',
  apple: 'apple.com',
  'apple music': 'music.apple.com',
  'apple tv': 'tv.apple.com',
  microsoft: 'microsoft.com',
  office: 'microsoft.com',
  'office 365': 'microsoft.com',
  onedrive: 'onedrive.live.com',
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
  openai: 'openai.com',
  chatgpt: 'openai.com',
  claude: 'anthropic.com',
  anthropic: 'anthropic.com',
  cursor: 'cursor.com',
  perplexity: 'perplexity.ai',
  midjourney: 'midjourney.com',
  copilot: 'github.com',
  adobe: 'adobe.com',
  photoshop: 'adobe.com',
  lightroom: 'adobe.com',
  dropbox: 'dropbox.com',
  mega: 'mega.io',
  box: 'box.com',
  notion: 'notion.so',
  evernote: 'evernote.com',
  todoist: 'todoist.com',
  trello: 'trello.com',
  asana: 'asana.com',
  monday: 'monday.com',
  jira: 'atlassian.com',
  confluence: 'atlassian.com',
  atlassian: 'atlassian.com',
  figma: 'figma.com',
  slack: 'slack.com',
  discord: 'discord.com',
  canva: 'canva.com',
  figjam: 'figma.com',
  zoom: 'zoom.us',
  teams: 'microsoft.com',
  webex: 'webex.com',
  hbo: 'max.com',
  max: 'max.com',
  disney: 'disneyplus.com',
  'disney+': 'disneyplus.com',
  disneyplus: 'disneyplus.com',
  'disney plus': 'disneyplus.com',
  hulu: 'hulu.com',
  paramount: 'paramountplus.com',
  'paramount+': 'paramountplus.com',
  paramountplus: 'paramountplus.com',
  peacock: 'peacocktv.com',
  crunchyroll: 'crunchyroll.com',
  prime: 'primevideo.com',
  'prime video': 'primevideo.com',
  amazon: 'amazon.com',
  twitch: 'twitch.tv',
  dazn: 'dazn.com',
  eurosport: 'eurosport.com',
  steam: 'steampowered.com',
  epic: 'epicgames.com',
  'epic games': 'epicgames.com',
  nintendo: 'nintendo.com',
  playstation: 'playstation.com',
  xbox: 'xbox.com',
  ubisoft: 'ubisoft.com',
  ea: 'ea.com',
  'ea play': 'ea.com',
  revolut: 'revolut.com',
  wise: 'wise.com',
  paypal: 'paypal.com',
  curve: 'curve.com',
  binance: 'binance.com',
  coinbase: 'coinbase.com',
  nordvpn: 'nordvpn.com',
  'nord vpn': 'nordvpn.com',
  expressvpn: 'expressvpn.com',
  'express vpn': 'expressvpn.com',
  surfshark: 'surfshark.com',
  protonvpn: 'protonvpn.com',
  'proton vpn': 'protonvpn.com',
  proton: 'proton.me',
  cyberghost: 'cyberghostvpn.com',
  'cyberghost vpn': 'cyberghostvpn.com',
  mullvad: 'mullvad.net',
  windscribe: 'windscribe.com',
  privateinternetaccess: 'privateinternetaccess.com',
  pia: 'privateinternetaccess.com',
  ipvanish: 'ipvanish.com',
  tunnelbear: 'tunnelbear.com',
  hostinger: 'hostinger.com',
  godaddy: 'godaddy.com',
  namecheap: 'namecheap.com',
  cloudflare: 'cloudflare.com',
  aws: 'aws.amazon.com',
  azure: 'azure.microsoft.com',
  vercel: 'vercel.com',
  netlify: 'netlify.com',
  heroku: 'heroku.com',
  digitalocean: 'digitalocean.com',
  linode: 'linode.com',
  vultr: 'vultr.com',
};

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^\w\s+.-]/g, ' ')
    .replace(/\s+/g, ' ');

const resolveBrandDomain = (name) => {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return null;
  }

  if (brandDomains[normalizedName]) {
    return brandDomains[normalizedName];
  }

  const matchingBrand = Object.keys(brandDomains)
    .sort((a, b) => b.length - a.length)
    .find((brandName) => {
      const normalizedBrandName = normalizeName(brandName);

      return (
        normalizedName.includes(normalizedBrandName) ||
        normalizedName.replace(/\s+/g, '').includes(normalizedBrandName.replace(/\s+/g, ''))
      );
    });

  return matchingBrand ? brandDomains[matchingBrand] : null;
};

const resolveBrandLogoUrl = (name) => {
  const domain = resolveBrandDomain(name);

  return domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${LOGO_SIZE}`
    : null;
};

module.exports = {
  resolveBrandDomain,
  resolveBrandLogoUrl,
};
