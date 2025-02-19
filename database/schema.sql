CREATE TABLE IF NOT EXISTS chat_channels (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES chat_channels(guild_id)
);

CREATE TABLE IF NOT EXISTS user_contexts (
    user_id TEXT PRIMARY KEY,
    context_type TEXT NOT NULL DEFAULT 'default'
);
