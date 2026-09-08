const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'aura.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('⚡ Conectado com sucesso ao Banco de Dados SQLite (aura.db)');
  }
});

// Inicialização das Tabelas
db.serialize(() => {
  // Tabela 1: Chaves de API por Dispositivo (TV)
  db.run(`
    CREATE TABLE IF NOT EXISTS device_keys (
      device_code TEXT PRIMARY KEY,
      gemini_key TEXT,
      chatgpt_key TEXT,
      claude_key TEXT,
      active_provider TEXT DEFAULT 'gemini',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela 2: Histórico de Prompts e Perguntas Enviadas do Celular
  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_code TEXT,
      prompt TEXT NOT NULL,
      provider TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Functions Helpers
function saveDeviceKeys(deviceCode, geminiKey, chatgptKey, claudeKey, activeProvider) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO device_keys (device_code, gemini_key, chatgpt_key, claude_key, active_provider, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(device_code) DO UPDATE SET
        gemini_key = coalesce(?, gemini_key),
        chatgpt_key = coalesce(?, chatgpt_key),
        claude_key = coalesce(?, claude_key),
        active_provider = coalesce(?, active_provider),
        updated_at = CURRENT_TIMESTAMP
    `;
    db.run(sql, [deviceCode, geminiKey, chatgptKey, claudeKey, activeProvider, geminiKey, chatgptKey, claudeKey, activeProvider], function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getDeviceKeys(deviceCode) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM device_keys WHERE device_code = ?`;
    db.get(sql, [deviceCode], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function savePromptHistory(deviceCode, prompt, provider) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO prompt_history (device_code, prompt, provider) VALUES (?, ?, ?)`;
    db.run(sql, [deviceCode, prompt, provider], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getPromptHistory(deviceCode, limit = 10) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM prompt_history WHERE device_code = ? ORDER BY created_at DESC LIMIT ?`;
    db.all(sql, [deviceCode, limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
  db,
  saveDeviceKeys,
  getDeviceKeys,
  savePromptHistory,
  getPromptHistory
};
