// handlers/profile.js
const { backButton } = require('../utils/keyboards');
const { getUser, formatPrice } = require('../utils/helpers');
const moment = require('moment');

module.exports = (bot) => {

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

        const user = await getUser(telegramId);
        if (!user) return;

        if (data === 'profile') {
            bot.editMessageText(
                `👤 *Profil utilisateur*\n\n` +
                `🔹 Nom : ${user.username}\n` +
                `📧 Email : ${user.email}\n` +
                `💰 Solde : ${formatPrice(user.balance)}\n` +
                `📦 Commandes : ${user.totalOrders}\n` +
                `✅ Succès : ${user.successfulOrders}\n` +
                `📅 Membre depuis : ${moment(user.createdAt).format('DD/MM/YYYY')}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: backButton()
                }
            );
            return;
        }
    });

};