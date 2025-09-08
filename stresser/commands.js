// commands.js
const { startBots, stopBots, broadcastChat, status } = require('./botManager');

function runCommand(input, ctx) {
  const args = input.split(' ');
  const cmd = args.shift();

  switch (cmd) {
    case '/help':
      console.log("Commands:");
      console.log("/start <ip:port> [count]");
      console.log("/stop [all|username]");
      console.log("/chat <msg>");
      console.log("/status");
      break;

    case '/start':
      startBots(args[0] || ctx.config.defaultServer, args[1] || ctx.accounts.length, ctx.accounts);
      break;

    case '/stop':
      stopBots(args[0] || "all");
      break;

    case '/chat':
      broadcastChat(args.join(' '));
      break;

    case '/status':
      status();
      break;

    default:
      console.log("❓ Unknown command. Type /help");
  }
}

module.exports = { runCommand };
