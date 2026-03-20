import './style.css';

function buildAPI() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  // Dev uses Vite plugin, prod uses Vercel rewrites
  if (import.meta.env.DEV) return '/api/games';
  return `/api/nhl/v1/schedule/${dateStr}`;
}
const API = buildAPI();

// Network abbreviation → { name, formerly? }
const NETWORKS = {
  'ABC': { name: 'ABC' },
  'ALT': { name: 'Altitude' },
  'CBC': { name: 'CBC' },
  'CHSN': { name: 'Chicago Sports', formerly: 'NBC Sports Chicago' },
  'CITY': { name: 'Citytv' },
  'ESPN': { name: 'ESPN' },
  'ESPN+': { name: 'ESPN+' },
  'FDSNDET': { name: 'FanDuel Sports DET', formerly: 'Bally Sports Detroit' },
  'FDSNMW': { name: 'FanDuel Sports MW', formerly: 'Bally Sports Midwest' },
  'FDSNNO': { name: 'FanDuel Sports NO', formerly: 'Bally Sports New Orleans' },
  'FDSNOH': { name: 'FanDuel Sports OH', formerly: 'Bally Sports Ohio' },
  'FDSNSC': { name: 'FanDuel Sports SC', formerly: 'Bally Sports South Carolina' },
  'FDSNSO': { name: 'FanDuel Sports SO', formerly: 'Bally Sports South' },
  'FDSNW': { name: 'FanDuel Sports W', formerly: 'Bally Sports West' },
  'FDSNWI': { name: 'FanDuel Sports WI', formerly: 'Bally Sports Wisconsin' },
  'HBO MAX': { name: 'Max', formerly: 'HBO Max' },
  'HULU': { name: 'Hulu' },
  'KCOP-13': { name: 'KCOP 13' },
  'KHN/Prime': { name: 'KHN / Prime Video' },
  'KING 5': { name: 'KING 5' },
  'KONG': { name: 'KONG' },
  'KTTV': { name: 'KTTV' },
  'KTVD': { name: 'KTVD' },
  'MNMT': { name: 'Monumental Sports', formerly: 'NBC Sports Washington' },
  'MORE27': { name: 'More 27' },
  'MSG': { name: 'MSG' },
  'MSG-B': { name: 'MSG Buffalo' },
  'MSGSN': { name: 'MSG Sportsnet' },
  'MSGSN2': { name: 'MSG Sportsnet 2' },
  'NBCSCA': { name: 'NBC Sports CA' },
  'NBCSP': { name: 'NBC Sports Philly' },
  'NESN': { name: 'NESN' },
  'NHLN': { name: 'NHL Network' },
  'Prime': { name: 'Prime Video' },
  'RDS': { name: 'RDS' },
  'RDS2': { name: 'RDS 2' },
  'SCRIPPS': { name: 'Scripps Sports', formerly: 'Bally Sports Florida' },
  'SN': { name: 'Sportsnet' },
  'SN-PIT': { name: 'Sportsnet PIT' },
  'SN1': { name: 'Sportsnet One' },
  'SN360': { name: 'Sportsnet 360' },
  'SNE': { name: 'Sportsnet East' },
  'SNO': { name: 'Sportsnet Ontario' },
  'SNP': { name: 'Sportsnet Pacific' },
  'SNW': { name: 'Sportsnet West' },
  'TNT': { name: 'TNT' },
  'TSN2': { name: 'TSN 2' },
  'TSN3': { name: 'TSN 3' },
  'TSN4': { name: 'TSN 4' },
  'TSN5': { name: 'TSN 5' },
  'TVAS': { name: 'TVA Sports' },
  'TVAS2': { name: 'TVA Sports 2' },
  'The Spot': { name: 'The Spot' },
  'Utah16': { name: 'Utah 16', formerly: 'AT&T SportsNet Rocky Mountain' },
  'Victory+': { name: 'Victory+' },
  'truTV': { name: 'truTV' },
};

function getNetwork(abbrev) {
  return NETWORKS[abbrev] || { name: abbrev };
}

const dateEl = document.getElementById('date');
const gamesEl = document.getElementById('games');
const loadingEl = document.getElementById('loading');

// Format today's date for the header
const now = new Date();
const formatted = now.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});
dateEl.textContent = formatted;

// Convert UTC ISO string → EST display time
function toEST(utcString) {
  const d = new Date(utcString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

// Get today's date string in ET for comparison
function todayET() {
  const d = new Date();
  const parts = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return parts; // YYYY-MM-DD
}

// Build the status badge
function renderStatus(game) {
  const state = game.gameState;

  if (state === 'FUT' || state === 'PRE') {
    return `<span class="status status--future">${toEST(game.startTimeUTC)} ET</span>`;
  }

  if (state === 'LIVE' || state === 'CRIT') {
    const period = game.periodDescriptor?.periodType === 'OT'
      ? 'OT'
      : game.periodDescriptor?.number
        ? `P${game.periodDescriptor.number}`
        : '';
    const clock = game.clock?.timeRemaining || '';
    const detail = [clock, period].filter(Boolean).join(' ');
    return `<span class="status status--live">LIVE${detail ? ' · ' + detail : ''}</span>`;
  }

  // OFF or FINAL
  const away = game.awayTeam?.score ?? '–';
  const home = game.homeTeam?.score ?? '–';
  const otLabel = game.periodDescriptor?.periodType === 'OT'
    ? '/OT'
    : game.periodDescriptor?.periodType === 'SO'
      ? '/SO'
      : '';
  return `<span class="status status--final">FINAL${otLabel} · ${away}–${home}</span>`;
}

// Build the channel columns — US first, Canada second
function renderChannels(broadcasts) {
  const ca = broadcasts.filter((b) => b.countryCode === 'CA').map((b) => getNetwork(b.network));
  const us = broadcasts.filter((b) => b.countryCode === 'US').map((b) => getNetwork(b.network));

  const renderList = (list) => {
    if (list.length === 0) return '<span class="no-broadcast">—</span>';
    return list
      .map((n) => `<div class="network">${n.name}${n.formerly ? `<span class="formerly">Formerly ${n.formerly}</span>` : ''}</div>`)
      .join('');
  };

  return `
    <div class="channels">
      <div class="channel-group">
        <div class="country">United States</div>
        <div class="networks">${renderList(us)}</div>
      </div>
      <div class="channel-group">
        <div class="country">Canada</div>
        <div class="networks">${renderList(ca)}</div>
      </div>
    </div>
  `;
}

// Render a single game card
function renderGame(game, index) {
  const away = game.awayTeam?.abbrev || '???';
  const home = game.homeTeam?.abbrev || '???';
  const awayLogo = game.awayTeam?.darkLogo || game.awayTeam?.logo || '';
  const homeLogo = game.homeTeam?.darkLogo || game.homeTeam?.logo || '';
  const broadcasts = game.tvBroadcasts || [];

  return `
    <div class="game" style="animation-delay: ${index * 60}ms">
      <div class="game-top">
        <div class="matchup">
          <span class="team"><img class="team-logo" src="${awayLogo}" alt="${away}" />${away}</span>
          <span class="at">@</span>
          <span class="team"><img class="team-logo" src="${homeLogo}" alt="${home}" />${home}</span>
        </div>
        ${renderStatus(game)}
      </div>
      ${renderChannels(broadcasts)}
    </div>
  `;
}

// Main fetch + render
async function init() {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    // Find today's games (ET date)
    const today = todayET();
    const dayData = data.gameWeek?.find((d) => d.date === today);
    const games = dayData?.games || [];

    loadingEl.remove();

    if (games.length === 0) {
      gamesEl.innerHTML = `
        <div class="empty">
          <div class="empty-title">No games today.</div>
          <div class="empty-sub">Check back tomorrow.</div>
        </div>
      `;
      return;
    }

    // Sort: LIVE first, then FUT by time, then FINAL
    const order = { LIVE: 0, CRIT: 0, PRE: 1, FUT: 1, OFF: 2, FINAL: 2 };
    games.sort((a, b) => {
      const oa = order[a.gameState] ?? 1;
      const ob = order[b.gameState] ?? 1;
      if (oa !== ob) return oa - ob;
      return new Date(a.startTimeUTC) - new Date(b.startTimeUTC);
    });

    gamesEl.innerHTML = games.map(renderGame).join('') +
      '<div class="tz-note">All times Eastern</div>';
  } catch (err) {
    loadingEl.remove();
    gamesEl.innerHTML = `
      <div class="error">
        <div class="error-title">Couldn't load games.</div>
        <div class="error-sub">${err.message}</div>
      </div>
    `;
  }
}

// Easter egg
document.querySelector('h1').addEventListener('click', () => {
  const u = new SpeechSynthesisUtterance('Geek E Wuss Dork');
  u.rate = 0.9;
  speechSynthesis.speak(u);
});

init();
