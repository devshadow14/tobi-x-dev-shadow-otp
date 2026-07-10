// handlers/start.js
const { mainMenu } = require('../utils/keyboards');
const { getUser, formatPrice } = require('../utils/helpers');
const { User } = require('../config/database');

module.exports = (bot) => {

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const from = msg.from;
        const telegramId = from.id;

        let user = await getUser(telegramId);

        if (!user) {
            try {
                const username = from.username || from.first_name || 'Utilisateur';
                const email = `${telegramId}@tobi.com`;
                const password = 'default123';

                user = await User.create({
                    telegramId: telegramId,
                    username: username,
                    email: email,
                    password: password,
                    balance: 0,
                    isAdmin: false
                });

                bot.sendMessage(chatId,
                    `👋 Salut *${username}* !\n\n` +
                    `Bienvenue sur *TOBI x SHADOW OTP* ! 🔥\n\n` +
                    `✅ Compte créé automatiquement\n` +
                    `💰 Solde : 0 FCFA\n\n` +
                    `Utilise le menu ci-dessous pour naviguer.`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: mainMenu()
                    }
                );
            } catch (error) {
                bot.sendMessage(chatId, '❌ Erreur lors de la création du compte.');
            }
        } else {
            bot.sendMessage(chatId,
                `👋 Salut *${user.username}* !\n\n` +
                `💰 Solde : ${formatPrice(user.balance)}\n` +
                `📦 Commandes : ${user.totalOrders}\n\n` +
                `Que veux-tu faire ?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: mainMenu()
                }
            );
        }
    });

};