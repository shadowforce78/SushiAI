const db = require('./database');

// Map pour stocker les contextes en mémoire
const contextCache = new Map();

async function getSystemContext(userId) {
    // D'abord, vérifier dans le cache
    if (contextCache.has(userId)) {
        return contextCache.get(userId);
    }

    // Sinon, obtenir depuis la base de données
    const context = await db.getUserContext(userId);
    
    // Contexte par défaut si aucun n'est trouvé
    const defaultContext = "Tu es un assistant IA amical et serviable. Tu dois répondre de manière concise et précise.";
    
    // Mettre en cache et retourner
    const finalContext = context || defaultContext;
    contextCache.set(userId, finalContext);
    return finalContext;
}

async function updateSystemContext(userId, newContext) {
    // Mettre à jour dans le cache
    contextCache.set(userId, newContext);
    
    // Mettre à jour dans la base de données
    await db.updateUserContext(userId, newContext);
    return newContext;
}

module.exports = {
    getSystemContext,
    updateSystemContext
};
