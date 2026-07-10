// handlers/numbers.js
const { countryMenu, serviceMenu, paymentMenu, backButton } = require('../utils/keyboards');
const { getUser, formatPrice, generateOrderNumber } = require('../utils/helpers');
const { Number, Order } = require('../config/database');

module.exports = (bot) => {

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

        const user = await getUser(telegramId);
        if (!user) return;

        if (data === 'numbers') {
            bot.editMessageText(
                `📱 *Acheter un numéro*\n\n` +
                `Étape 1/3 : Choisissez le pays`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: countryMenu()
                }
            );
            return;
        }

        if (data.startsWith('country_')) {
            const countryIndex = parseInt(data.split('_')[1]);
            const countries = ['France', 'USA', 'UK', 'Canada', 'Allemagne', 'Indonésie'];
            const country = countries[countryIndex];

            global.userStates = global.userStates || {};
            global.userStates[chatId] = { country: country };

            bot.editMessageText(
                `📱 *Acheter un numéro*\n\n` +
                `🌍 Pays sélectionné : ${country}\n` +
                `Étape 2/3 : Choisissez le service`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: serviceMenu()
                }
            );
            return;
        }

        if (data.startsWith('service_')) {
            const serviceIndex = parseInt(data.split('_')[1]);
            const services = ['WhatsApp', 'Telegram', 'TikTok', 'Gmail', 'Amazon', 'Facebook'];
            const service = services[serviceIndex];

            const country = global.userStates[chatId]?.country || 'France';

            const availableNumber = await Number.findOne({
                where: { country: country, service: service, isAvailable: true }
            });

            if (!availableNumber) {
                bot.editMessageText(
                    `❌ *Aucun numéro disponible*\n\n` +
                    `🌍 Pays : ${country}\n` +
                    `📱 Service : ${service}\n\n` +
                    `😕 Désolé, aucun numéro n'est disponible.\n\n` +
                    `💡 Essayez un autre pays ou service.`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: backButton()
                    }
                );
                return;
            }

            if (user.balance < availableNumber.price) {
                bot.editMessageText(
                    `❌ *Solde insuffisant !*\n\n` +
                    `💰 Solde : ${formatPrice(user.balance)}\n` +
                    `📞 Prix : ${formatPrice(availableNumber.price)}\n\n` +
                    `💳 Veuillez recharger votre compte.`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: backButton()
                    }
                );
                return;
            }

            const order = await Order.create({
                userId: user.id,
                country: country,
                service: service,
                phone: availableNumber.phone,
                price: availableNumber.price,
                status: 'pending',
                orderNumber: generateOrderNumber()
            });

            user.balance -= availableNumber.price;
            user.totalOrders += 1;
            await user.save();

            availableNumber.isAvailable = false;
            await availableNumber.save();

            bot.editMessageText(
                `✅ *Numéro acheté !*\n\n` +
                `📋 Commande : #${order.orderNumber}\n` +
                `🌍 Pays : ${country}\n` +
                `📱 Service : ${service}\n` +
                `📞 Numéro : ${availableNumber.phone}\n` +
                `💰 Prix : ${formatPrice(availableNumber.price)}\n` +
                `⏳ Statut : En attente de validation...\n\n` +
                `💬 Envoyez le paiement à *DEV SHADOW - 776227173* via WhatsApp.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: paymentMenu()
                }
            );

            delete global.userStates[chatId];
            return;
        }

        if (data === 'paid') {
            const pendingOrder = await Order.findOne({
                where: { userId: user.id, status: 'pending' },
                order: [['createdAt', 'DESC']]
            });

            if (!pendingOrder) {
                bot.editMessageText('❌ Aucune commande en attente.', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: backButton()
                });
                return;
            }

            pendingOrder.status = 'success';
            await pendingOrder.save();

            user.successfulOrders += 1;
            await user.save();

            bot.editMessageText(
                `✅ *Paiement confirmé !*\n\n` +
                `📋 Commande : #${pendingOrder.orderNumber}\n` +
                `📞 Numéro : ${pendingOrder.phone}\n` +
                `💰 Prix : ${formatPrice(pendingOrder.price)}\n` +
                `✅ Statut : Validé\n\n` +
                `📱 Le numéro est actif pour recevoir votre OTP.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: backButton()
                }
            );
            return;
        }

        if (data === 'cancel_payment') {
            const pendingOrder = await Order.findOne({
                where: { userId: user.id, status: 'pending' },
                order: [['createdAt', 'DESC']]
            });

            if (pendingOrder) {
                pendingOrder.status = 'cancelled';
                await pendingOrder.save();

                user.balance += pendingOrder.price;
                await user.save();

                const number = await Number.findOne({ where: { phone: pendingOrder.phone } });
                if (number) {
                    number.isAvailable = true;
                    await number.save();
                }
            }

            bot.editMessageText(
                `❌ *Paiement annulé*\n\n` +
                `💰 Solde remboursé : ${formatPrice(pendingOrder ? pendingOrder.price : 0)}`,
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