// botManager.js
// Full manager: Mineflayer + ProxyAgent + AuthMe auto register/login + actions
const fs = require('fs');
const mineflayer = require('mineflayer');
const ProxyAgent = require('proxy-agent');
const msu = require('minecraft-server-util');

const ACCOUNTS_PATH = './accounts.json';
const PROXIES_PATH = './proxies.txt';
const CHATLOG_PATH = './chatlog.txt';
const LOGS_DIR = './logs';

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

// load accounts (the file should contain username+password entries)
let accounts = require(ACCOUNTS_PATH);

// load proxies (keep original formatting: http://..., socks4://...)
let proxies = [];
if (fs.existsSync(PROXIES_PATH)) {
  proxies = fs.readFileSync(PROXIES_PATH, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

// in-memory bots map
const botMap = new Map(); // username -> { bot, account, proxy, state }

function saveChatLine(line) {
  try {
    fs.appendFileSync(CHATLOG_PATH, line + '\n');
  } catch (e) {}
}

function logBot(username, text) {
  const file = `${LOGS_DIR}/${username}.log`;
  const line = `[${new Date().toISOString()}] ${text}`;
  try { fs.appendFileSync(file, line + '\n'); } catch (e) {}
}

function pickProxyForIndex(idx) {
  if (!proxies || proxies.length === 0) return null;
  return proxies[idx % proxies.length];
}

function parseServer(serverStr) {
  const [hostPart, portPart] = serverStr.split(':');
  const host = hostPart;
  const port = portPart ? parseInt(portPart, 10) : 25565;
  return { host, port };
}

// create and start one bot
function createBot(account, server, proxyString, reconnect = true) {
  const opts = {
    host: server.host,
    port: server.port,
    username: account.username,
    // cracked servers: do NOT set auth options (password is used for AuthMe, not Mojang)
    // Note: Mineflayer will accept username for cracked servers when offline-mode is false on server.
    version: false // autodetect
  };

  // If a proxy string is provided, pass agent
  if (proxyString) {
    try {
      opts.agent = new ProxyAgent(proxyString);
    } catch (e) {
      console.warn(`[proxy] failed to build agent for ${proxyString}: ${e.message}`);
    }
  }

  let bot;
  try {
    bot = mineflayer.createBot(opts);
  } catch (err) {
    console.error(`[createBot] ${account.username} create failed: ${err.message}`);
    return null;
  }

  const meta = { bot, account, proxy: proxyString, server, state: 'connecting', idx: null };
  botMap.set(account.username, meta);
  logBot(account.username, `Spawning bot (proxy=${proxyString || 'direct'})`);

  // helper to safely chat and log
  function safeChat(msg) {
    try {
      bot.chat(msg);
      logBot(account.username, `SENT_CHAT: ${msg}`);
    } catch (e) {
      logBot(account.username, `CHAT_ERR: ${e.message}`);
    }
  }

  // When the bot is connected and has a game session
  bot.on('login', () => {
    meta.state = 'logged-in';
    const info = `${account.username} logged in (proxy=${proxyString || 'direct'})`;
    console.log(`[login] ${info}`);
    logBot(account.username, info);
  });

  // On spawn, try AuthMe login/register sequence
  bot.on('spawn', () => {
    meta.state = 'spawned';
    logBot(account.username, 'spawned - attempting authme login/register');

    // Try login then register as fallback.
    // Some servers will reject unknown commands — that's okay.
    try {
      // wait a little for server to send messages
      setTimeout(() => {
        safeChat(`/login ${account.password}`);
        // after a bit, also try register in case login is required first-time.
        setTimeout(() => {
          safeChat(`/register ${account.password} ${account.password}`);
        }, 2500);
      }, 1500);
    } catch (e) {
      logBot(account.username, `auth attempt error: ${e.message}`);
    }
  });

  // Log chat lines; write to chatlog and console
  bot.on('chat', (username, message) => {
    const line = `[CHAT][${account.username}] ${username}: ${message}`;
    console.log(line);
    saveChatLine(line);
    logBot(account.username, `CHAT: ${username}: ${message}`);
  });

  // Kicked event
  bot.on('kicked', (reason) => {
    const text = `[KICKED] ${account.username} reason: ${reason}`;
    console.log(text);
    logBot(account.username, text);
    // put kick reason to console (so you can copy-paste into server chat if you want)
    saveChatLine(text);
    // attempt reconnect if allowed
    if (reconnect) {
      meta.state = 'kicked';
      setTimeout(() => {
        try {
          bot.end(); // ensure clean
        } catch (e) {}
        // recreate the bot
        createBot(account, server, proxyString, reconnect);
      }, 3000);
    }
  });

  bot.on('end', () => {
    const text = `[END] ${account.username} disconnected`;
    console.log(text);
    logBot(account.username, text);
    saveChatLine(text);
    // attempt reconnect if still mapped
    if (reconnect) {
      meta.state = 'disconnected';
      setTimeout(() => {
        if (botMap.has(account.username)) {
          createBot(account, server, proxyString, reconnect);
        }
      }, 4000);
    }
  });

  bot.on('error', (err) => {
    const text = `[ERROR] ${account.username}: ${err.message}`;
    console.log(text);
    logBot(account.username, text);
    saveChatLine(text);
    // for some errors, end + reconnect
    try { bot.end(); } catch (e) {}
  });

  // When a player tab list is updated, mineflayer emits 'playerJoined'/'playerLeft' sometimes.
  // We'll also fetch server status on demand via external query (see getServerInfo below)

  return meta;
}

// PUBLIC API

// start count bots on serverStr (serverStr = "ip:port")
function start(serverStr, count) {
  const server = parseServer(serverStr);
  console.log(`[manager] start requested -> ${count} bots -> ${server.host}:${server.port}`);

  // ensure accounts length >= count
  if (accounts.length < count) {
    console.warn('[manager] not enough accounts for requested count; reducing to available accounts');
    count = accounts.length;
  }

  for (let i = 0; i < count; i++) {
    const acc = accounts[i];
    if (botMap.has(acc.username)) {
      console.log(`[manager] ${acc.username} already running, skipping`);
      continue;
    }
    const proxy = pickProxyForIndex(i);
    const meta = createBot(acc, server, proxy, true);
    if (meta) meta.idx = i;
  }
}

// stop a specific bot by name or 'all'
function stop(target = 'all') {
  if (target === 'all') {
    for (const [name, meta] of botMap.entries()) {
      try {
        meta.bot.end('Kicked by manager (stop all)');
      } catch (e) {}
      botMap.delete(name);
      console.log(`[manager] stopped ${name}`);
    }
    return;
  }
  const meta = botMap.get(target);
  if (!meta) {
    console.log(`[manager] bot ${target} not found`);
    return;
  }
  try {
    meta.bot.end('Kicked by manager (stop)');
  } catch (e) {}
  botMap.delete(target);
  console.log(`[manager] stopped ${target}`);
}

// broadcast chat through all bots
function broadcast(msg) {
  for (const [name, meta] of botMap.entries()) {
    try { meta.bot.chat(msg); } catch (e) { logBot(name, `broadcast failed: ${e.message}`); }
  }
  console.log(`[manager] broadcasted: ${msg}`);
  saveChatLine(`[BROADCAST] ${msg}`);
}

// send chat from one bot
function chatFrom(botName, msg) {
  const meta = botMap.get(botName);
  if (!meta) { console.log(`[manager] ${botName} not online`); return; }
  try {
    meta.bot.chat(msg);
    console.log(`[chat] ${botName}: ${msg}`);
  } catch (e) { console.log(`[chat] send failed: ${e.message}`); }
}

// status dump
function status() {
  console.log('--- Manager Status ---');
  console.log(`total accounts: ${accounts.length}`);
  console.log(`running bots: ${botMap.size}`);
  for (const [name, meta] of botMap.entries()) {
    console.log(` - ${name} [state=${meta.state}] proxy=${meta.proxy || 'direct'}`);
  }
  console.log('----------------------');
}

// do random walk / control toggles
const actionStates = {
  walk: false,
  run: false,
  fight: false,
  spam: false,
};

// simple action loops (per-bot)
function startActionLoops() {
  // walk/run loops
  setInterval(() => {
    for (const [name, meta] of botMap.entries()) {
      try {
        const bot = meta.bot;
        if (!bot || !bot.player) continue;
        if (actionStates.walk || actionStates.run) {
          // toggle forward for a random small time
          const hold = Math.random() * 2000 + 500;
          bot.setControlState('forward', true);
          if (actionStates.run) bot.setControlState('sprint', true);
          setTimeout(() => {
            try {
              bot.setControlState('forward', false);
              if (actionStates.run) bot.setControlState('sprint', false);
            } catch (e) {}
          }, hold);
        }
        // fighting: find nearest entity and attack
        if (actionStates.fight) {
          const target = Object.values(bot.entities)
            .filter(e => e && e.type === 'player' && e.username !== bot.username)
            .sort((a,b) => (bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position)))[0];
          if (target) {
            try { bot.attack(target); logBot(name, `attacking ${target.username || target.type}`); } catch(e) {}
          }
        }
        // spam: random chat lines
        if (actionStates.spam && Math.random() < 0.02) {
          const msg = `spam_${Math.random().toString(36).slice(2,8)}`;
          try { bot.chat(msg); logBot(name, `spammed: ${msg}`); } catch(e) {}
        }
      } catch (e) {}
    }
  }, 800);
}

// simple function to toggle actions
function setAction(action, on) {
  if (!actionStates.hasOwnProperty(action)) {
    console.log('[manager] unknown action', action); return;
  }
  actionStates[action] = !!on;
  console.log(`[manager] action ${action} set to ${on}`);
}

// Query server status (MOTD, player sample) using minecraft-server-util
async function getServerInfo(host, port = 25565) {
  try {
    const res = await msu.status(host, port, { timeout: 3000 });
    // res has: version, players, description (motd), sample, etc.
    return res;
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

// Public exported functions
module.exports = {
  start,
  stop,
  broadcast,
  chatFrom,
  status,
  setAction,
  actionStates,
  getServerInfo
};

// start loops immediately
startActionLoops();
