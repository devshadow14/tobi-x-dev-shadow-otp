// handlers/admin.js
const { adminMenu, adminDepositsMenu, backButton } = require('../utils/keyboards');
const { getUser, formatPrice } = require('../utils/helpers');
const { User, Order, Deposit, Number } = require('../config/database');
const moment = require('moment');

module.exports = (bot) => {

    // Vérification du code admin (message)
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        const telegramId = msg.from.id;

        const adminCode = process.env.ADMIN_CODE || 'tobi x shadow';

        if (global.userStates && global.userStates[chatId] === 'awaiting_admin_code') {
            if (text === adminCode) {
                const user = await getUser(telegramId);
                if (user) {
                    user.isAdmin = true;
                    await user.save();
                    bot.sendMessage(chatId,
                        '✅ *Code correct !*\n\n' +
                        'Vous avez maintenant accès au Panel Admin.',
                        {
                            parse_mode: 'Markdown',
                            reply_markup: adminMenu()
                        }
                    );
                    delete global.userStates[chatId];
                }
            } else {
                bot.sendMessage(chatId,
                    '❌ *Code incorrect !*\n\n' +
                    'Veuillez réessayer ou tapez /cancel pour annuler.',
                    { parse_mode: 'Markdown' }
                );
            }
            return;
        }
    });

    // Callbacks admin
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const telegramId = callbackQuery.from.id;

        const user = await getUser(telegramId);
        if (!user) return;

        // ===== ADMIN LOGIN =====
        if (data === 'admin_login') {
            if (user.isAdmin) {
                bot.editMessageText(
                    '🔐 *Panel Admin*\n\n' +
                    'Bienvenue dans le panneau d\'administration.\n\n' +
                    'Choisissez une option :',
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: adminMenu()
                    }
                );
            } else {
                bot.sendMessage(chatId,
                    '🔐 *Accès Panel Admin*\n\n' +
                    'Entrez le *code d\'accès* pour accéder au panel administrateur.\n\n' +
                    '📝 Exemple : `tobi x shadow`',
                    { parse_mode: 'Markdown' }
                );
                global.userStates = global.userStates || {};
                global.userStates[chatId] = 'awaiting_admin_code';
            }
            return;
        }

        // ===== ADMIN DASHBOARD =====
        if (data === 'admin_dashboard' && user.isAdmin) {
            const totalUsers = await User.count();
            const totalOrders = await Order.count();
            const pendingDeposits = await Deposit.count({ where: { status: 'pending' } });
            const totalRevenue = await Order.sum('price');

            bot.editMessageText(
                `📊 *Dashboard Admin*\n\n` +
                `👥 Utilisateurs : ${totalUsers}\n` +
                `📦 Commandes totales : ${totalOrders}\n` +
                `💰 Revenus totaux : ${formatPrice(totalRevenue || 0)}\n` +
                `⏳ Dépôts en attente : ${pendingDeposits}`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: adminMenu()
                }
            );
            return;
        }

        // ===== ADMIN USERS =====
        if (data === 'admin_users' && user.isAdmin) {
            const users = await User.findAll({ limit: 10 });

            let msg = '📋 *Liste des utilisateurs*\n\n';
            users.forEach((u, i) => {
                const status = u.isBanned ? '🚫 Banni' : '✅ Actif';
                msg += `${i+1}. @${u.username} | ${formatPrice(u.balance)} | ${status}\n`;
            });

            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
                    ]
                }
            });
            return;
        }

        // ===== ADMIN NUMBERS =====
        if (data === 'admin_numbers' && user.isAdmin) {
            const numbers = await Number.findAll({ limit: 10 });

            let msg = '📱 *Liste des numéros*\n\n';
            numbers.forEach((n, i) => {
                const status = n.isAvailable ? '✅ Dispo' : '❌ Vendu';
                msg += `${i+1}. ${n.country} | ${n.service} | ${n.phone} | ${formatPrice(n.price)} | ${status}\n`;
            });

            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
                    ]
                }
            });
            return;
        }

        // ===== ADMIN DEPOSITS =====
        if (data === 'admin_deposits' && user.isAdmin) {
            const pendingDeposits = await Deposit.findAll({ where: { status: 'pending' } });

            if (pendingDeposits.length === 0) {
                bot.editMessageText('✅ Aucun dépôt en attente.', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: adminDepositsMenu()
                });
                return;
            }

            let msg = '⏳ *Dépôts en attente*\n\n';
            pendingDeposits.forEach((deposit, i) => {
                msg += `${i+1}. @${deposit.username} | ${formatPrice(deposit.amount)} | ${moment(deposit.createdAt).format('DD/MM HH:mm')}\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    ...pendingDeposits.map((deposit, i) => [
                        { text: `✅ Valider ${formatPrice(deposit.amount)} - @${deposit.username}`, callback_data: `admin_validate_deposit_${deposit.id}` }
                    ]),
                    [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
                ]
            };

            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            return;
        }

        // ===== ADMIN VALIDATE DEPOSIT =====
        if (data.startsWith('admin_validate_deposit_') && user.isAdmin) {
            const depositId = parseInt(data.split('_')[3]);
            const deposit = await Deposit.findOne({ where: { id: depositId } });

            if (!deposit) {
                bot.sendMessage(chatId, '❌ Dépôt introuvable.');
                return;
            }

            deposit.status = 'paid';
            await deposit.save();

            const userDeposit = await User.findOne({ where: { id: deposit.userId } });
            if (userDeposit) {
                userDeposit.balance += deposit.amount;
                await userDeposit.save();
            }

            bot.sendMessage(chatId,
                `✅ *Dépôt validé !*\n\n` +
                `👤 Utilisateur : @${deposit.username}\n` +
                `💰 Montant : ${formatPrice(deposit.amount)}`,
                { parse_mode: 'Markdown' }
            );

            if (userDeposit) {
                bot.sendMessage(userDeposit.telegramId,
                    `✅ *Votre dépôt a été validé !*\n\n` +
                    `💰 Montant : ${formatPrice(deposit.amount)}\n` +
                    `💳 Nouveau solde : ${formatPrice(userDeposit.balance)}`,
                    { parse_mode: 'Markdown' }
                );
            }

            bot.editMessageText('✅ Dépôt validé avec succès.', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: adminDepositsMenu()
            });
            return;
        }

        // ===== ADMIN =====
        if (data === 'admin' && user.isAdmin) {
            bot.editMessageText(
                '🔐 *Panel Admin*\n\n' +
                'Choisissez une option :',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: adminMenu()
                }
            );
            return;
        }
    });

};