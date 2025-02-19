const contexts = require('./botContexts');
const db = require('./database');

const getSystemContext = async (userId) => {
    const contextType = await db.getUserContext(userId);
    return contexts[contextType].getContext();
};

module.exports = { getSystemContext };
