const fs = require('fs');
const mineflayer = require('mineflayer');
const ProxyAgent = require('proxy-agent');

let bots = {};
let proxies = [];

// load proxies
if (fs.existsSync('proxies.txt')) {
  proxies = fs.readFileSync('proxies.txt', 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

const accounts = require('./accounts.json');

function parseServer(serverStr) {
  const [host, port] = serverStr.split(':');
  return { host, port: parseInt(port) || 25565 };
}

function start(serverStr, count) {
  const server = parseServer(serverStr);

  for (let i = 0; i < count && i < accounts.length; i++) {
    const account = accounts[i];
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;

    const botOptions = {
      host: server.host,
      port: server.port,
      username: account.username,
      password: account.password
    };

    if (proxy) {
      botOptions.agent = new ProxyAgent(proxy);
    }

    const bot = mineflayer.createBot(botOptions);

    bot.on('login', () => {
      console.log(`[login] ${account.username} joined via ${proxy || 'direct'}`);
    });

    bot.on('spawn', () => {
      // Try login first, fallback to register
      bot.chat(`/login ${account.password}`);
      setTimeout(() => {
        bot.chat(`/register ${account.password} ${account.password}`);
      }, 3000);
    });

    bot.on('chat', (username, message) => {
      if (username !== account.username) {
        fs.appendFileSync('chatlog.txt', `[${account.username}] ${username}: ${message}\n`);
      }
    });

    bot.on('kicked', (reason) => {
      console.log(`[kick] ${account.username}: ${reason}`);
    });

    bot.on('error', (err) => {
      console.log(`[error] ${account.username}: ${err.message}`);
    });

    bots[account.username] = bot;
  }
}

function stop(target) {
  if (target === 'all') {
    Object.values(bots).forEach(bot => bot.end());
    bots = {};
    console.log("🛑 All bots stopped");
  } else if (bots[target]) {
    bots[target].end();
    delete bots[target];
    console.log(`🛑 Bot ${target} stopped`);
  } else {
    console.log(`⚠️ Bot ${target} not found`);
  }
}

function chat(msg) {
  Object.values(bots).forEach(bot => {
    bot.chat(msg);
  });
  console.log(`[chat] Sent: ${msg}`);
}

function status() {
  console.log("📊 Active Bots:");
  Object.keys(bots).forEach(name => console.log(` - ${name}`));
}

module.exports = { start, stop, chat, status };
