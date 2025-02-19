const fs = require('fs');
const path = require('path');

const counterFile = path.join(__dirname, '../data/requestCount.json');

// Assure que le dossier data existe
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initialise ou charge le compteur
const loadCounter = () => {
    try {
        if (fs.existsSync(counterFile)) {
            return JSON.parse(fs.readFileSync(counterFile));
        }
    } catch (error) {
        console.error('Erreur lors du chargement du compteur:', error);
    }
    return { count: 0, date: new Date().toISOString().split('T')[0] };
};

const saveCounter = (data) => {
    fs.writeFileSync(counterFile, JSON.stringify(data));
};

const checkAndIncrementCounter = () => {
    const data = loadCounter();
    const today = new Date().toISOString().split('T')[0];

    // Réinitialise le compteur si c'est un nouveau jour
    if (data.date !== today) {
        data.count = 0;
        data.date = today;
    }

    // Vérifie si la limite est atteinte
    if (data.count >= 1500) {
        return false;
    }

    // Incrémente le compteur
    data.count++;
    saveCounter(data);
    return true;
};

module.exports = { 
    checkAndIncrementCounter,
    loadCounter
};
