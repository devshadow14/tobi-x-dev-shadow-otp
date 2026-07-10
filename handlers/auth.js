// handlers/auth.js
const { adminMenu } = require('../utils/keyboards');
const { getUser } = require('../utils/helpers');

module.exports = (bot) => {

    // Commande /admin
    bot.onText(/\/admin/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId,
            '🔐 *Accès Panel Admin*\n\n' +
            'Entrez le *code d\'accès* pour accéder au panel administrateur.\n\n' +
            '📝 Exemple : `tobi x shadow`',
            { parse_mode: 'Markdown' }
        );
        global.userStates = global.userStates || {};
        global.userStates[chatId] = 'awaiting_admin_code';
    });

};