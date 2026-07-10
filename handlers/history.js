// handlers/history.js
const { backButton } = require('../utils/keyboards');
const { getUser, formatPrice, getStatusEmoji } = require('../utils/helpers');
const { Order } = require('../config/database');

module.exports = (bot) => {

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

        const user = await getUser(telegramId);
        if (!user) return;

        if (data === 'history') {
            const orders = await Order.findAll({
                where: { userId: user.id },
                order: [['createdAt', 'DESC']],
                limit: 10
            });

            if (orders.length === 0) {
                bot.editMessageText(
                    '📋 *Historique*\n\n' +
                    'Aucune commande effectuée pour le moment.\n\n' +
                    '📱 Achetez votre premier numéro !',
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: backButton()
                    }
                );
                return;
            }

            let msg = '📋 *Historique des commandes*\n\n';
            orders.forEach((order, index) => {
                msg += `${index + 1}. #${order.orderNumber} | ${order.country} | ${order.service} | ${formatPrice(order.price)} | ${getStatusEmoji(order.status)}\n`;
            });
            msg += `\n📊 *Total :* ${user.totalOrders} commandes`;
            msg += `\n✅ *Succès :* ${user.successfulOrders}`;

            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: backButton()
            });
            return;
        }
    });

};