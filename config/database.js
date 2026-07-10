// config/database.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Connexion SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../data/database.sqlite'),
    logging: false
});

// MODÈLES
const User = require('../models/User')(sequelize, DataTypes);
const Order = require('../models/Order')(sequelize, DataTypes);
const Deposit = require('../models/Deposit')(sequelize, DataTypes);
const Number = require('../models/Number')(sequelize, DataTypes);

// RELATIONS
User.hasMany(Order, { foreignKey: 'userId' });
User.hasMany(Deposit, { foreignKey: 'userId' });

async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de données connectée');
        await sequelize.sync({ force: false });
        console.log('✅ Tables synchronisées');
        
        // Ajouter des numéros par défaut
        const count = await Number.count();
        if (count === 0) {
            const defaultNumbers = [
                { country: 'France', service: 'WhatsApp', phone: '+33 6 12 34 56 78', price: 200, isAvailable: true },
                { country: 'France', service: 'WhatsApp', phone: '+33 6 87 65 43 21', price: 200, isAvailable: true },
                { country: 'USA', service: 'Telegram', phone: '+1 514 700 12 14', price: 250, isAvailable: true },
                { country: 'UK', service: 'TikTok', phone: '+44 7700 123456', price: 300, isAvailable: true },
                { country: 'Canada', service: 'Gmail', phone: '+1 647 123 4567', price: 220, isAvailable: true },
                { country: 'Indonésie', service: 'WhatsApp', phone: '+62 812 3456 7890', price: 150, isAvailable: true },
            ];
            await Number.bulkCreate(defaultNumbers);
            console.log('✅ 6 numéros par défaut ajoutés');
        }
        
        return { sequelize, User, Order, Deposit, Number };
    } catch (error) {
        console.error('❌ Erreur base de données:', error);
        process.exit(1);
    }
}

module.exports = { initDatabase, sequelize };