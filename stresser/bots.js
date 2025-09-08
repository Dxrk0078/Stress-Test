// bots.js
const readline = require('readline');
const config = require('./config.json');
const accounts = require('./accounts.json');
const { runCommand } = require('./commands');

// Setup readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("✅ Bot Manager Started");

function askQuestions() {
  rl.question(`Enter server (IP:Port) [default ${config.defaultServer}]: `, (serverInput) => {
    const server = serverInput.trim() || config.defaultServer;

    rl.question(`Enter number of bots [default ${accounts.length}]: `, (countInput) => {
      const count = parseInt(countInput.trim() || accounts.length, 10);

      console.log(`➡ Starting ${count} bots on ${server}...`);
      runCommand(`/start ${server} ${count}`, { config, accounts });

      // Switch to interactive console
      console.log("Type /help for commands");
      rl.setPrompt('> ');
      rl.prompt();

      rl.on('line', (line) => {
        runCommand(line.trim(), { config, accounts });
        rl.prompt();
      });
    });
  });
}

askQuestions();
