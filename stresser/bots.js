const readline = require('readline');
const commands = require('./commands');
const botManager = require('./botManager');
const fs = require('fs');

const config = require('./config.json');
const accounts = require('./accounts.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("✅ Bot Manager Started");

rl.question(`Enter server (IP:Port) [default ${config.defaultServer}]: `, (serverInput) => {
  const server = serverInput.trim() || config.defaultServer;
  rl.question(`Enter number of bots [default ${accounts.length}]: `, (countInput) => {
    const count = parseInt(countInput.trim()) || accounts.length;

    // auto start bots
    botManager.start(server, count);

    console.log("Type /help for commands");
    rl.on('line', (input) => {
      commands.handle(input.trim(), botManager);
    });
  });
});
