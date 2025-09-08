function handle(input, botManager) {
  const [cmd, ...args] = input.split(" ");

  switch (cmd) {
    case '/help':
      console.log(`/start <ip:port> <count> - start bots`);
      console.log(`/stop <botname|all>     - stop bots`);
      console.log(`/chat <msg>             - broadcast message`);
      console.log(`/status                 - show bots`);
      break;

    case '/start':
      botManager.start(args[0], parseInt(args[1]));
      break;

    case '/stop':
      botManager.stop(args[0] || 'all');
      break;

    case '/chat':
      botManager.chat(args.join(" "));
      break;

    case '/status':
      botManager.status();
      break;

    default:
      console.log("❓ Unknown command. Use /help");
  }
}

module.exports = { handle };
