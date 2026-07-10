// index.js
require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

// ===== IMPORTS =====
const { initDatabase, User, Order, Deposit, Number } = require('./config/database');
const { 
    mainMenu, adminMenu, adminUsersMenu, adminNumbersMenu, adminDepositsMenu,
    backButton, countryMenu, serviceMenu, depositAmountMenu, paymentMenu 
} = require('./utils/keyboards');
const { 
    getUser, updateBalance, formatPrice, maskPhone, 
    getStatusEmoji, generateOrderNumber, isAdmin 
} = require('./utils/helpers');

// ===== INITIALISATION =====
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN manquant dans .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const app = express();
const PORT = process.env.PORT || 3000;

// ===== SERVEUR WEB =====
app.get('/', (req, res) => {
    res.send('🤖 TOBI x SHADOW OTP - Bot Telegram en ligne');
});

app.listen(PORT, () => {
    console.log(`✅ Serveur web démarré sur le port ${PORT}`);
});

// ===== BASE DE DONNÉES =====
let db;
initDatabase().then(database => {
    db = database;
    console.log('✅ Bot prêt !');
});

// ===== VARIABLES GLOBALES =====
const userStates = {};

// ===== COMMANDE /START =====
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

// ===== COMMANDE /ADMIN =====
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '🔐 *Accès Panel Admin*\n\n' +
        'Entrez le *code d\'accès* pour accéder au panel administrateur.\n\n' +
        '📝 Exemple : `tobi x shadow`',
        { parse_mode: 'Markdown' }
    );
    userStates[chatId] = 'awaiting_admin_code';
});

// ===== GESTION ADMIN CODE =====
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (userStates[chatId] === 'awaiting_admin_code') {
        const adminCode = process.env.ADMIN_CODE || 'tobi x shadow';
        
        if (text === adminCode) {
            const user = await getUser(msg.from.id);
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
                delete userStates[chatId];
            }
        } else {
            bot.sendMessage(chatId, 
                '❌ *Code incorrect !*\n\n' +
                'Veuillez réessayer ou tapez /cancel pour annuler.',
                { parse_mode: 'Markdown' }
            );
        }
    }
});

// ===== CALLBACK QUERY =====
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const telegramId = callbackQuery.from.id;

    let user = await getUser(telegramId);
    if (!user) {
        bot.sendMessage(chatId, '❌ Veuillez d\'abord taper /start');
        return;
    }

    // ===== HOME =====
    if (data === 'home') {
        bot.editMessageText(
            `🏠 *Accueil*\n\n` +
            `👤 Utilisateur : ${user.username}\n` +
            `💰 Solde : ${formatPrice(user.balance)}\n` +
            `📦 Commandes : ${user.totalOrders}\n\n` +
            `Que veux-tu faire ?`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: mainMenu()
            }
        );
        return;
    }

    // ===== NUMÉROS =====
    if (data === 'numbers') {
        const availableNumbers = await Number.findAll({ where: { isAvailable: true } });
        
        if (availableNumbers.length === 0) {
            bot.editMessageText(
                '❌ *Aucun numéro disponible*\n\n' +
                '😕 Désolé, aucun numéro n\'est disponible pour le moment.\n\n' +
                '💡 Revenez dans quelques minutes.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: backButton()
                }
            );
            return;
        }

        let msg = '📱 *Numéros disponibles*\n\n';
        availableNumbers.forEach((num, index) => {
            msg += `${index + 1}. ${num.country} | ${num.service} | ${maskPhone(num.phone)} | ${formatPrice(num.price)}\n`;
        });
        msg += '\nClique sur un numéro ci-dessous pour l\'acheter.';

        const keyboard = {
            inline_keyboard: [
                ...availableNumbers.map((num, index) => [
                    { text: `📞 ${num.country} - ${num.service} - ${formatPrice(num.price)}`, callback_data: `buy_${num.id}` }
                ]),
                [{ text: '◀️ Retour', callback_data: 'home' }]
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

    // ===== ACHAT NUMÉRO =====
    if (data.startsWith('buy_')) {
        const numberId = parseInt(data.split('_')[1]);
        const number = await Number.findOne({ where: { id: numberId } });

        if (!number || !number.isAvailable) {
            bot.editMessageText('❌ Ce numéro n\'est plus disponible.', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: backButton()
            });
            return;
        }

        if (user.balance < number.price) {
            bot.editMessageText(
                `❌ *Solde insuffisant !*\n\n` +
                `💰 Solde : ${formatPrice(user.balance)}\n` +
                `📞 Prix : ${formatPrice(number.price)}\n\n` +
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

        // Créer la commande
        const order = await Order.create({
            userId: user.id,
            country: number.country,
            service: number.service,
            phone: number.phone,
            price: number.price,
            status: 'pending',
            orderNumber: generateOrderNumber()
        });

        // Débiter le solde
        user.balance -= number.price;
        user.totalOrders += 1;
        await user.save();

        // Marquer le numéro comme indisponible
        number.isAvailable = false;
        await number.save();

        bot.editMessageText(
            `✅ *Numéro acheté !*\n\n` +
            `📋 Commande : #${order.orderNumber}\n` +
            `🌍 Pays : ${number.country}\n` +
            `📱 Service : ${number.service}\n` +
            `📞 Numéro : ${number.phone}\n` +
            `💰 Prix : ${formatPrice(number.price)}\n` +
            `⏳ Statut : En attente de validation...\n\n` +
            `💬 Envoyez le paiement à *DEV SHADOW - 776227173* via WhatsApp, puis cliquez sur "J'ai payé".`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: paymentMenu()
            }
        );
        return;
    }

    // ===== PAIEMENT =====
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

    // ===== ANNULER PAIEMENT =====
    if (data === 'cancel_payment') {
        const pendingOrder = await Order.findOne({ 
            where: { userId: user.id, status: 'pending' },
            order: [['createdAt', 'DESC']]
        });

        if (pendingOrder) {
            pendingOrder.status = 'cancelled';
            await pendingOrder.save();
            
            // Rembourser
            user.balance += pendingOrder.price;
            await user.save();

            // Remettre le numéro disponible
            const number = await Number.findOne({ where: { phone: pendingOrder.phone } });
            if (number) {
                number.isAvailable = true;
                await number.save();
            }
        }

        bot.editMessageText(
            `❌ *Paiement annulé*\n\n` +
            `💰 Solde remboursé : ${formatPrice(pendingOrder ? pendingOrder.price : 0)}\n\n` +
            `Vous pouvez réessayer plus tard.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: backButton()
            }
        );
        return;
    }

    // ===== DÉPÔTS =====
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

    // ===== DÉPÔT MONTANT =====
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
            `⏳ Après paiement, un admin validera votre dépôt.`,
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

    // ===== DÉPÔT PAYÉ =====
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
            `⏳ Un administrateur validera votre dépôt sous 24h.\n` +
            `📱 Vous serez notifié une fois validé.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: backButton()
            }
        );

        // Notifier les admins
        const admins = await User.findAll({ where: { isAdmin: true } });
        admins.forEach(admin => {
            bot.sendMessage(admin.telegramId, 
                `📢 *Nouveau dépôt en attente !*\n\n` +
                `👤 Utilisateur : ${user.username}\n` +
                `💰 Montant : ${formatPrice(deposit.amount)}\n` +
                `🆔 Transaction : #${deposit.id}\n\n` +
                `Utilisez le panel Admin pour valider.`,
                { parse_mode: 'Markdown' }
            );
        });
        return;
    }

    // ===== HISTORIQUE =====
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
            const statusEmoji = getStatusEmoji(order.status);
            msg += `${index + 1}. #${order.orderNumber} | ${order.country} | ${order.service} | ${formatPrice(order.price)} | ${statusEmoji}\n`;
        });
        msg += '\n*📊 Total :* ' + user.totalOrders + ' commandes';
        msg += '\n*✅ Succès :* ' + user.successfulOrders;

        bot.editMessageText(msg, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: backButton()
        });
        return;
    }

    // ===== PROFIL =====
    if (data === 'profile') {
        bot.editMessageText(
            `👤 *Profil utilisateur*\n\n` +
            `🔹 Nom : ${user.username}\n` +
            `📧 Email : ${user.email}\n` +
            `💰 Solde : ${formatPrice(user.balance)}\n` +
            `📦 Commandes : ${user.totalOrders}\n` +
            `✅ Succès : ${user.successfulOrders}\n` +
            `📅 Membre depuis : ${moment(user.createdAt).format('DD/MM/YYYY')}\n\n` +
            `Quelle action veux-tu faire ?`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✏️ Modifier email', callback_data: 'edit_email' }],
                        [{ text: '🔒 Changer mot de passe', callback_data: 'change_password' }],
                        [{ text: '◀️ Retour', callback_data: 'home' }]
                    ]
                }
            }
        );
        return;
    }

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
            userStates[chatId] = 'awaiting_admin_code';
        }
        return;
    }

    // ===== ADMIN DASHBOARD =====
    if (data === 'admin_dashboard' && user.isAdmin) {
        const totalUsers = await User.count();
        const totalOrders = await Order.count();
        const pendingDeposits = await Deposit.count({ where: { status: 'pending' } });
        const totalRevenue = await Order.sum('price');
        const successOrders = await Order.count({ where: { status: 'success' } });

        bot.editMessageText(
            `📊 *Dashboard Admin*\n\n` +
            `👥 Utilisateurs : ${totalUsers}\n` +
            `📦 Commandes totales : ${totalOrders}\n` +
            `✅ Commandes réussies : ${successOrders}\n` +
            `💰 Revenus totaux : ${formatPrice(totalRevenue || 0)}\n` +
            `⏳ Dépôts en attente : ${pendingDeposits}\n\n` +
            `Choisissez une action :`,
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
        bot.editMessageText(
            `👥 *Gestion des utilisateurs*\n\n` +
            `Choisissez une action :`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: adminUsersMenu()
            }
        );
        return;
    }

    // ===== ADMIN LIST USERS =====
    if (data === 'admin_list_users' && user.isAdmin) {
        const users = await User.findAll({ limit: 10 });
        
        let msg = '📋 *Liste des utilisateurs*\n\n';
        users.forEach((u, i) => {
            const status = u.isBanned ? '🚫 Banni' : '✅ Actif';
            msg += `${i+1}. @${u.username} | ${formatPrice(u.balance)} | ${status}\n`;
        });
        msg += '\n📄 Page 1/5';

        bot.editMessageText(msg, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔍 Chercher un utilisateur', callback_data: 'admin_search_user' }],
                    [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
                ]
            }
        });
        return;
    }

    // ===== ADMIN NUMBERS =====
    if (data === 'admin_numbers' && user.isAdmin) {
        bot.editMessageText(
            `📱 *Gestion des numéros*\n\n` +
            `Choisissez une action :`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: adminNumbersMenu()
            }
        );
        return;
    }

    // ===== ADMIN ADD NUMBER =====
    if (data === 'admin_add_number' && user.isAdmin) {
        bot.sendMessage(chatId, 
            `📱 *Ajouter un numéro*\n\n` +
            `Entrez les informations du numéro au format :\n\n` +
            `Pays | Service | Numéro | Prix\n\n` +
            `*Exemple :*\n` +
            `France | WhatsApp | +33 6 12 34 56 78 | 200\n\n` +
            `📝 Tapez "annuler" pour annuler.`,
            { parse_mode: 'Markdown' }
        );
        userStates[chatId] = 'awaiting_add_number';
        return;
    }

    // ===== ADMIN DEPOSITS =====
    if (data === 'admin_deposits' && user.isAdmin) {
        bot.editMessageText(
            `💰 *Gestion des dépôts*\n\n` +
            `Choisissez une action :`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: adminDepositsMenu()
            }
        );
        return;
    }

    // ===== ADMIN PENDING DEPOSITS =====
    if (data === 'admin_pending_deposits' && user.isAdmin) {
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
                [{ text: '◀️ Retour', callback_data: 'admin_deposits' }]
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

        // Créditer l'utilisateur
        const userDeposit = await User.findOne({ where: { id: deposit.userId } });
        if (userDeposit) {
            userDeposit.balance += deposit.amount;
            await userDeposit.save();
        }

        bot.sendMessage(chatId, 
            `✅ *Dépôt validé !*\n\n` +
            `👤 Utilisateur : @${deposit.username}\n` +
            `💰 Montant : ${formatPrice(deposit.amount)}\n\n` +
            `💳 Solde crédité.`,
            { parse_mode: 'Markdown' }
        );

        // Notifier l'utilisateur
        if (userDeposit) {
            bot.sendMessage(userDeposit.telegramId, 
                `✅ *Votre dépôt a été validé !*\n\n` +
                `💰 Montant : ${formatPrice(deposit.amount)}\n` +
                `💳 Nouveau solde : ${formatPrice(userDeposit.balance)}\n\n` +
                `Merci pour votre confiance ! 🙏`,
                { parse_mode: 'Markdown' }
            );
        }

        // Mettre à jour le message
        bot.editMessageText('✅ Dépôt validé avec succès.', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: adminDepositsMenu()
        });
        return;
    }

    // ===== ADMIN CONFIG =====
    if (data === 'admin_config' && user.isAdmin) {
        bot.editMessageText(
            `⚙️ *Configuration*\n\n` +
            `📱 WhatsApp : ${process.env.WHATSAPP_NUMBER}\n` +
            `🏦 Nom : DEV SHADOW\n` +
            `💰 Devise : ${process.env.CURRENCY}\n\n` +
            `📝 Tapez /set_whatsapp [numéro] pour modifier le numéro WhatsApp.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: backButton()
            }
        );
        return;
    }

    // ===== ADMIN LOGS =====
    if (data === 'admin_logs' && user.isAdmin) {
        const recentOrders = await Order.findAll({ 
            order: [['createdAt', 'DESC']], 
            limit: 10,
            include: [{ model: User, attributes: ['username'] }]
        });

        let msg = '📋 *Logs d\'activité*\n\n';
        recentOrders.forEach((order) => {
            const userObj = order.User;
            const statusEmoji = getStatusEmoji(order.status);
            msg += `${moment(order.createdAt).format('DD/MM HH:mm')} | @${userObj ? userObj.username : 'Inconnu'} | ${order.service} | ${formatPrice(order.price)} | ${statusEmoji}\n`;
        });
        msg += '\n📄 Page 1/5';

        bot.editMessageText(msg, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: backButton()
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

    // ===== GESTION ADD NUMBER (message) =====
    if (userStates[chatId] === 'awaiting_add_number' && user.isAdmin) {
        if (text === 'annuler') {
            bot.sendMessage(chatId, '❌ Annulé.', { reply_markup: adminMenu() });
            delete userStates[chatId];
            return;
        }

        const parts = text.split('|').map(s => s.trim());
        if (parts.length !== 4) {
            bot.sendMessage(chatId, '❌ Format incorrect. Utilisez : Pays | Service | Numéro | Prix');
            return;
        }

        const [country, service, phone, priceStr] = parts;
        const price = parseFloat(priceStr);

        if (isNaN(price)) {
            bot.sendMessage(chatId, '❌ Prix invalide.');
            return;
        }

        try {
            await Number.create({
                country,
                service,
                phone,
                price,
                isAvailable: true
            });

            bot.sendMessage(chatId, 
                `✅ *Numéro ajouté !*\n\n` +
                `🌍 Pays : ${country}\n` +
                `📱 Service : ${service}\n` +
                `📞 Numéro : ${phone}\n` +
                `💰 Prix : ${formatPrice(price)}`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: adminMenu()
                }
            );
            delete userStates[chatId];
        } catch (error) {
            bot.sendMessage(chatId, '❌ Erreur lors de l\'ajout du numéro.');
        }
        return;
    }
});

// ===== COMMANDE /CANCEL =====
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (userStates[chatId]) {
        delete userStates[chatId];
        bot.sendMessage(chatId, '❌ Action annulée.', { reply_markup: mainMenu() });
    }
});

// ===== COMMANDE /SET_WHATSAPP (admin) =====
bot.onText(/\/set_whatsapp (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const user = await getUser(telegramId);

    if (!user || !user.isAdmin) {
        bot.sendMessage(chatId, '❌ Accès réservé aux administrateurs.');
        return;
    }

    const newNumber = match[1];
    if (!newNumber.match(/^[0-9+ ]+$/)) {
        bot.sendMessage(chatId, '❌ Numéro invalide.');
        return;
    }

    // Mettre à jour .env (ou simplement en mémoire)
    process.env.WHATSAPP_NUMBER = newNumber;
    bot.sendMessage(chatId, 
        `✅ *Numéro WhatsApp mis à jour !*\n\n` +
        `📱 Nouveau numéro : ${newNumber}`,
        { parse_mode: 'Markdown' }
    );
});

console.log('🤖 TOBI x SHADOW OTP - Bot en ligne !');