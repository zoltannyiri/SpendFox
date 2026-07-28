const UPDATED_AT = '2026-07-28';
const SUPPORT_EMAIL = 'spendfox.team@gmail.com';

const page = ({ title, body }) => `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - SpendFox</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f3f5f8; }
    main { max-width: 820px; margin: 0 auto; padding: 40px 20px 64px; }
    article { background: #fff; border-radius: 24px; padding: 28px; box-shadow: 0 12px 32px rgba(15, 23, 42, .08); }
    h1 { margin-top: 0; color: #19386e; }
    h2 { margin-top: 28px; }
    a { color: #0ca9f2; font-weight: 700; }
    .muted { color: #6b7280; }
  </style>
</head>
<body>
  <main>
    <article>
      ${body}
      <p class="muted">Utols&oacute; friss&iacute;t&eacute;s: ${UPDATED_AT}</p>
    </article>
  </main>
</body>
</html>`;

const sendHtml = (res, html) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
};

const privacy = (req, res) =>
  sendHtml(
    res,
    page({
      title: 'Adatv&eacute;delmi t&aacute;j&eacute;koztat&oacute;',
      body: `
        <h1>Adatv&eacute;delmi t&aacute;j&eacute;koztat&oacute;</h1>
        <p>A SpendFox egy el&#337;fizet&eacute;s-k&ouml;vet&#337; alkalmaz&aacute;s. Az app c&eacute;lja, hogy seg&iacute;tsen &aacute;tl&aacute;tni a felhaszn&aacute;l&oacute; &aacute;ltal megadott el&#337;fizet&eacute;seket, k&ouml;lts&eacute;geket &eacute;s &eacute;rtes&iacute;t&eacute;seket.</p>
        <h2>Kezelt adatok</h2>
        <p>Regisztr&aacute;ci&oacute; &eacute;s haszn&aacute;lat sor&aacute;n kezelhet&uuml;nk email c&iacute;met, nevet, felhaszn&aacute;l&oacute;nevet, opcion&aacute;lis avatar URL-t, el&#337;fizet&eacute;s adatokat, deviza- &eacute;s kateg&oacute;riaadatokat, push notification tokent, app verzi&oacute;t &eacute;s &eacute;rtes&iacute;t&eacute;si be&aacute;ll&iacute;t&aacute;sokat.</p>
        <h2>Mire haszn&aacute;ljuk az adatokat?</h2>
        <p>Az adatokat bejelentkez&eacute;shez, profilkezel&eacute;shez, el&#337;fizet&eacute;sek list&aacute;z&aacute;s&aacute;hoz, &aacute;rfolyam-konverzi&oacute;hoz, push/email &eacute;rtes&iacute;t&eacute;sekhez &eacute;s appfriss&iacute;t&eacute;si &eacute;rtes&iacute;t&eacute;sekhez haszn&aacute;ljuk.</p>
        <h2>K&uuml;ls&#337; szolg&aacute;ltat&oacute;k</h2>
        <p>Az app Firebase/Firestore szolg&aacute;ltat&aacute;st haszn&aacute;l adatt&aacute;rol&aacute;sra &eacute;s hiteles&iacute;t&eacute;sre, Firebase Cloud Messaginget push &eacute;rtes&iacute;t&eacute;sekhez, SMTP email k&uuml;ld&eacute;st &eacute;rtes&iacute;t&eacute;sekhez, valamint k&uuml;ls&#337; &aacute;rfolyamforr&aacute;st deviza-konverzi&oacute;hoz.</p>
        <h2>Adatt&ouml;rl&eacute;s</h2>
        <p>A felhaszn&aacute;l&oacute; az appban k&eacute;rheti fi&oacute;kja t&ouml;rl&eacute;s&eacute;t. A t&ouml;rl&eacute;s elt&aacute;vol&iacute;tja a profiladatokat, a Firebase Auth felhaszn&aacute;l&oacute;t, az el&#337;fizet&eacute;seket &eacute;s a regisztr&aacute;lt push tokeneket.</p>
        <h2>Kapcsolat</h2>
        <p>K&eacute;rd&eacute;s vagy adatt&ouml;rl&eacute;si ig&eacute;ny eset&eacute;n &iacute;rj erre az email c&iacute;mre: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    })
  );

const terms = (req, res) =>
  sendHtml(
    res,
    page({
      title: 'Felhaszn&aacute;l&aacute;si felt&eacute;telek',
      body: `
        <h1>Felhaszn&aacute;l&aacute;si felt&eacute;telek</h1>
        <p>A SpendFox haszn&aacute;lat&aacute;val elfogadod, hogy az alkalmaz&aacute;s el&#337;fizet&eacute;sek nyilv&aacute;ntart&aacute;s&aacute;ra &eacute;s k&ouml;lts&eacute;gbecsl&eacute;sre szolg&aacute;l.</p>
        <h2>Nem p&eacute;nz&uuml;gyi tan&aacute;csad&aacute;s</h2>
        <p>Az alkalmaz&aacute;s nem min&#337;s&uuml;l p&eacute;nz&uuml;gyi, jogi vagy ad&oacute;tan&aacute;csad&aacute;snak. Az &aacute;rfolyamok &eacute;s becsl&eacute;sek t&aacute;j&eacute;koztat&oacute; jelleg&#369;ek.</p>
        <h2>Felhaszn&aacute;l&oacute;i felel&#337;ss&eacute;g</h2>
        <p>A felhaszn&aacute;l&oacute; felel az&eacute;rt, hogy pontos adatokat adjon meg, &eacute;s a szolg&aacute;ltat&oacute;k fel&eacute; id&#337;ben int&eacute;zze az el&#337;fizet&eacute;sek m&oacute;dos&iacute;t&aacute;s&aacute;t vagy lemond&aacute;s&aacute;t.</p>
        <h2>El&eacute;rhet&#337;s&eacute;g</h2>
        <p>Kapcsolat: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    })
  );

const deleteAccount = (req, res) =>
  sendHtml(
    res,
    page({
      title: 'Fi&oacute;k t&ouml;rl&eacute;se',
      body: `
        <h1>Fi&oacute;k t&ouml;rl&eacute;se</h1>
        <p>A SpendFox fi&oacute;kod t&ouml;rl&eacute;s&eacute;t az alkalmaz&aacute;son bel&uuml;l tudod elind&iacute;tani a Profil be&aacute;ll&iacute;t&aacute;sok k&eacute;perny&#337;n.</p>
        <h2>T&ouml;r&ouml;lt adatok</h2>
        <p>A t&ouml;rl&eacute;s elt&aacute;vol&iacute;tja a profilodat, a bejelentkez&eacute;si fi&oacute;kodat, az el&#337;fizet&eacute;seidet &eacute;s a push &eacute;rtes&iacute;t&eacute;si tokeneket.</p>
        <h2>Alternat&iacute;v t&ouml;rl&eacute;si k&eacute;r&eacute;s</h2>
        <p>Ha nem f&eacute;rsz hozz&aacute; az apphoz, &iacute;rj emailt err&#337;l a regisztr&aacute;lt email c&iacute;medr&#337;l: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    })
  );

module.exports = {
  privacy,
  terms,
  deleteAccount,
};
