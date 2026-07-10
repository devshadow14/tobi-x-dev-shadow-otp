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

        const adminCode = process