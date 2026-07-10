// index.js
require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const { initDatabase } = require('./config/database');
const { mainMenu } = require('./utils/keyboards');
const { getUser, formatPrice } = require('./utils/helpers');
const { User, Order } = require('./config/database');

// ===== INITIALISATION =====
const token = config.botToken;
if (!token) {
    console.error('❌ BOT_TOKEN manquant dans .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const app = express();
const PORT = config.port || 3000;

// ===== SERVEUR WEB =====
app.get('/', (req, res) => {
    res.send('🤖 TOBI x SHADOW OTP - Bot Telegram en ligne');
});

app.listen(PORT, () => {
    console.log(`✅ Serveur web démarré sur le port ${PORT}`);
});

// ===== BASE DE DONNÉES =====
initDatabase().then(() => {
    console.log('✅ Bot prêt !');
}).catch(err => {
    console.error('❌ Erreur base de données:', err);
});

// ===== VARIABLES GLOBALES =====
global.userStates = {};

// ===== HANDLERS =====
require('./handlers/start')(bot);
require('./handlers/auth')(bot);
require('./handlers/deposit')(bot);
require('./handlers/numbers')(bot);
require('./handlers/history')(bot);
require('./handlers/profile')(bot);
require('./handlers/admin')(bot);

// ===== COMMANDE /CANCEL =====
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (global.userStates[chatId]) {
        delete global.userStates[chatId];
        bot.sendMessage(chatId, '❌ Action annulée.', { reply_markup: mainMenu() });
    }
});

// ===== COMMANDE /STATS (admin) =====
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const user = await getUser(telegramId);

    if (!user || !user.isAdmin) {
        bot.sendMessage(chatId, '❌ Accès réservé aux administrateurs.');
        return;
    }

    const totalUsers = await User.count();
    const totalOrders = await Order.count();
    const totalRevenue = await Order.sum('price');

    bot.sendMessage(chatId,
        `📊 *Statistiques*\n\n` +
        `👥 Utilisateurs : ${totalUsers}\n` +
        `📦 Commandes : ${totalOrders}\n` +
        `💰 Revenus : ${formatPrice(totalRevenue || 0)}`,
        { parse_mode: 'Markdown' }
    );
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

    process.env.WHATSAPP_NUMBER = newNumber;
    bot.sendMessage(chatId,
        `✅ *Numéro WhatsApp mis à jour !*\n\n` +
        `📱 Nouveau numéro : ${newNumber}`,
        { parse_mode: 'Markdown' }
    );
});

console.log('🤖 TOBI x SHADOW OTP - Bot en ligne !');