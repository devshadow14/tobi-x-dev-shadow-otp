// handlers/deposit.js
const { depositAmountMenu, backButton } = require('../utils/keyboards');
const { getUser, formatPrice } = require('../utils/helpers');
const { Deposit, User } = require('../config/database');

module.exports = (bot) => {

    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

        const user = await getUser(telegramId);
        if (!user) return;

        if (data === 'deposit') {
            bot.editMessageText(
                `💰 *Dépôts*\n\n` +
                `Choisissez le montant à recharger :\n\n` +
                `📱 Méthode : Mobile Money\n` +
                `📞 Destinataire : DEV SHADOW\n` +
                `📞 Numéro : 776227173\n\n` +
                `💳 Sélectionnez un montant :`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: depositAmountMenu()
                }
            );
            return;
        }

        if (data.startsWith('deposit_')) {
            const amount = parseInt(data.split('_')[1]);

            const deposit = await Deposit.create({
                userId: user.id,
                username: user.username,
                amount: amount,
                method: 'mobile_money',
                status: 'pending'
            });

            bot.editMessageText(
                `💰 *Demande de dépôt*\n\n` +
                `💳 Montant : ${formatPrice(amount)}\n` +
                `📱 Méthode : Mobile Money\n` +
                `📞 Destinataire : DEV SHADOW\n` +
                `📞 Numéro : 776227173\n` +
                `🆔 Transaction : #${deposit.id}\n\n` +
                `📤 Envoyez le montant à *DEV SHADOW - 776227173* via WhatsApp.\n\n` +
                `⏳ Après paiement, cliquez sur "J'ai payé".`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Payer via WhatsApp', url: `https://wa.me/776227173?text=Dépôt%20${formatPrice(amount)}` }],
                            [{ text: '✅ J\'ai payé', callback_data: `deposit_paid_${deposit.id}` }],
                            [{ text: '◀️ Retour', callback_data: 'deposit' }]
                        ]
                    }
                }
            );
            return;
        }

        if (data.startsWith('deposit_paid_')) {
            const depositId = parseInt(data.split('_')[2]);
            const deposit = await Deposit.findOne({ where: { id: depositId, userId: user.id } });

            if (!deposit) {
                bot.editMessageText('❌ Dépôt introuvable.', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: backButton()
                });
                return;
            }

            deposit.status = 'pending';
            await deposit.save();

            bot.editMessageText(
                `✅ *Dépôt en attente de validation*\n\n` +
                `💰 Montant : ${formatPrice(deposit.amount)}\n` +
                `🆔 Transaction : #${deposit.id}\n\n` +
                `⏳ Un administrateur validera votre dépôt sous 24h.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: backButton()
                }
            );

            const admins = await User.findAll({ where: { isAdmin: true } });
            admins.forEach(admin => {
                bot.sendMessage(admin.telegramId,
                    `📢 *Nouveau dépôt en attente !*\n\n` +
                    `👤 Utilisateur : ${user.username}\n` +
                    `💰 Montant : ${formatPrice(deposit.amount)}\n` +
                    `🆔 Transaction : #${deposit.id}`,
                    { parse_mode: 'Markdown' }
                );
            });
            return;
        }
    });

};