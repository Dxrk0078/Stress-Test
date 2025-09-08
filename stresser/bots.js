// bots.js - entry point (full interactive console)
const fs = require('fs');
const readline = require('readline');
const config = require('./config.json');
const accounts = require('./accounts.json');
const commands = require('./commands');
const botManager = require('./botManager');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('✅ Minecraft Bot Manager (final) started');
console.log('Config:', { defaultServer: config.defaultServer, maxBots: config.maxBots });

function askStartup() {
  rl.question(`Enter server (IP:Port) [default ${config.defaultServer}]: `, (serverInput) => {
    const server = serverInput.trim() || config.defaultServer;
    rl.question(`Enter number of bots [default ${Math.min(accounts.length, config.maxBots)}]: `, (countInput) => {
      const requested = parseInt(countInput.trim());
      const count = Number.isInteger(requested) ? Math.min(requested, config.maxBots, accounts.length) : Math.min(accounts.length, config.maxBots);
      console.log(`➡ Will start ${count} bots on ${server}`);
      // start automatically
      commands.run(`/start ${server} ${count}`, { botManager, config, accounts });
      console.log('Type /help for commands. Console will also show bot events.');
      rl.prompt();
    });
  });
}

// Read commands from console
rl.on('line', (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }

  // special: allow shortcuts to stop gracefully
  if (input === '/exit' || input === 'exit' || input === 'quit') {
    console.log('Shutting down all bots...');
    botManager.stop('all');
    rl.close();
    process.exit(0);
  }

  commands.run(input, { botManager, config, accounts, rl });
  rl.prompt();
});

// start
askStartup();
