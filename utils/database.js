const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        const dbPath = path.join(__dirname, '../database/chat.db');
        const schemaPath = path.join(__dirname, '../database/schema.sql');

        // Créer le dossier database s'il n'existe pas
        if (!fs.existsSync(path.dirname(dbPath))) {
            fs.mkdirSync(path.dirname(dbPath));
        }

        this.db = new sqlite3.Database(dbPath);

        // Initialiser la base de données avec le schéma
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schema);
        }
    }

    setChatChannel(guildId, channelId) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT OR REPLACE INTO chat_channels (guild_id, channel_id) VALUES (?, ?)';
            this.db.run(sql, [guildId, channelId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getChatChannel(guildId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT channel_id FROM chat_channels WHERE guild_id = ?';
            this.db.get(sql, [guildId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.channel_id);
            });
        });
    }

    async saveChat(guildId, userId, message, response) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO chat_history (guild_id, user_id, message, response) VALUES (?, ?, ?, ?)';
            this.db.run(sql, [guildId, userId, message, response], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getRecentHistory(guildId, userId, limit = 20) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT message, response, user_id 
                FROM chat_history 
                WHERE guild_id = ? AND user_id = ?
                ORDER BY timestamp DESC 
                LIMIT ?`;
            this.db.all(sql, [guildId, userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Nouvelle méthode pour nettoyer l'historique trop ancien
    cleanOldHistory(guildId, userId, hoursToKeep = 24) {
        return new Promise((resolve, reject) => {
            const sql = `
                DELETE FROM chat_history 
                WHERE guild_id = ? 
                AND user_id = ?
                AND timestamp < datetime('now', '-' || ? || ' hours')`;
            this.db.run(sql, [guildId, userId, hoursToKeep], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    setUserContext(userId, contextType) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT OR REPLACE INTO user_contexts (user_id, context_type) VALUES (?, ?)';
            this.db.run(sql, [userId, contextType], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Added method to update user context using the same logic as setUserContext
    updateUserContext(userId, context) {
        return this.setUserContext(userId, context);
    }

    getUserContext(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT context_type FROM user_contexts WHERE user_id = ?';
            this.db.get(sql, [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.context_type || 'default');
            });
        });
    }
}

module.exports = new Database();
