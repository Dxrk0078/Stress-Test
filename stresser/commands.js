// commands.js - console command parser (uses botManager)
const fs = require('fs');

function showHelp() {
  console.log('Commands:');
  console.log('/help                         - show this');
  console.log('/start <ip:port> <count>      - start bots');
  console.log('/stop <botname|all>           - stop single bot or all');
  console.log('/chat <msg>                   - broadcast chat from all bots');
  console.log('/say <botname> <msg>          - send chat from a single bot');
  console.log('/status                       - show running bots');
  console.log('/spam on|off                  - toggle spam mode');
  console.log('/walk on|off                  - toggle walking');
  console.log('/run on|off                   - toggle running');
  console.log('/fight on|off                 - toggle fight mode');
  console.log('/players <host:port>          - query server players/MOTD/plugins info');
  console.log('/logs <botname>               - show last lines of a bot log');
  console.log('/reloadproxies                - reload proxies.txt');
  console.log('/exit                         - stop and exit');
}

function tailFile(path, lines = 30) {
  try {
    if (!fs.existsSync(path)) return console.log('no log file');
    const txt = fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
    const out = txt.slice(-lines).join('\n');
    console.log(out);
  } catch (e) {
    console.log('tail error', e.message);
  }
}

async function run(input, ctx) {
  const parts = input.split(' ').filter(Boolean);
  const cmd = parts.shift();
  if (!cmd) return;

  const manager = ctx.botManager;

  switch (cmd) {
    case '/help':
      showHelp();
      break;

    case '/start': {
      const server = parts[0] || ctx.config.defaultServer;
      const count = parseInt(parts[1]) || Math.min(ctx.accounts.length, ctx.config.maxBots);
      manager.start(server, count);
      break;
    }

    case '/stop': {
      const target = parts[0] || 'all';
      manager.stop(target);
      break;
    }

    case '/chat': {
      const msg = parts.join(' ');
      manager.broadcast(msg);
      break;
    }

    case '/say': {
      const botname = parts.shift();
      const msg = parts.join(' ');
      manager.chatFrom(botname, msg);
      break;
    }

    case '/status': {
      manager.status();
      break;
    }

    case '/spam': {
      const mode = parts[0] === 'on';
      manager.setAction('spam', mode);
      break;
    }

    case '/walk': {
      const mode = parts[0] === 'on';
      manager.setAction('walk', mode);
      break;
    }

    case '/run': {
      const mode = parts[0] === 'on';
      manager.setAction('run', mode);
      break;
    }

    case '/fight': {
      const mode = parts[0] === 'on';
      manager.setAction('fight', mode);
      break;
    }

    case '/players': {
      const serverStr = parts[0] || ctx.config.defaultServer;
      const [host, portStr] = serverStr.split(':');
      const port = parseInt(portStr) || 25565;
      console.log(`[players] querying ${host}:${port} ...`);
      const info = await manager.getServerInfo(host, port);
      console.log('server info:', info);
      break;
    }

    case '/logs': {
      const botname = parts[0];
      if (!botname) return console.log('usage: /logs <botname>');
      tailFile(`./logs/${botname}.log`, 200);
      break;
    }

    case '/reloadproxies': {
      // reload proxies file
      const text = fs.existsSync('./proxies.txt') ? fs.readFileSync('./proxies.txt', 'utf8') : '';
      fs.writeFileSync('./proxies.txt', text); // touch
      console.log('/reloadproxies done');
      break;
    }

    default:
      console.log('Unknown command. Type /help');
  }
}

module.exports = { run };
