// botManager.js
const fs = require('fs');
const crypto = require('crypto');

const accountsPath = './accounts.json';
let accounts = require(accountsPath);

const activeBots = new Map();

// Generate random password
function randomPass() {
  return crypto.randomBytes(4).toString('hex'); // 8-char random hex
}

// Ensure all accounts have passwords
function initAccounts() {
  let changed = false;
  accounts.forEach(acc => {
    if (!acc.password) {
      acc.password = randomPass();
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    console.log("[botManager] Added missing passwords to accounts.json");
  }
}

function startBots(server, count, accList) {
  initAccounts();
  console.log(`[botManager] Starting ${count} bots on ${server}`);
  for (let i = 0; i < count; i++) {
    const acc = accList[i];
    if (!acc) break;
    activeBots.set(acc.username, { username: acc.username, password: acc.password, status: "connected (fake)" });
    console.log(`[botManager] Bot ${acc.username} started with pass ${acc.password}`);
  }
}

function stopBots(target = "all") {
  if (target === "all") {
    activeBots.clear();
    console.log("[botManager] All bots stopped");
  } else {
    activeBots.delete(target);
    console.log(`[botManager] Bot ${target} stopped`);
  }
}

function broadcastChat(msg) {
  console.log(`[botManager] (Fake) Bots say: ${msg}`);
}

function status() {
  console.log(`[botManager] Active bots: ${activeBots.size}`);
  for (const [name, info] of activeBots) {
    console.log(` - ${name} (pass: ${info.password}, ${info.status})`);
  }
}

module.exports = { startBots, stopBots, broadcastChat, status, activeBots };
