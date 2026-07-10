// utils/helpers.js
const { User, Order } = require('../config/database');

// Récupérer un utilisateur
async function getUser(telegramId) {
    const user = await User.findOne({ where: { telegramId } });
    return user;
}

// Mettre à jour le solde
async function updateBalance(telegramId, amount) {
    const user = await getUser(telegramId);
    if (user) {
        user.balance += amount;
        await user.save();
        return true;
    }
    return false;
}

// Formater le prix
function formatPrice(amount) {
    return `${amount.toLocaleString()} ${process.env.CURRENCY || 'FCFA'}`;
}

// Masquer un numéro
function maskPhone(phone) {
    if (!phone) return '****';
    const parts = phone.split(' ');
    if (parts.length > 1) {
        const last = parts[parts.length - 1];
        const masked = last.slice(0, 2) + '****' + last.slice(-2);
        return parts.slice(0, -1).join(' ') + ' ' + masked;
    }
    return phone.slice(0, 4) + '****' + phone.slice(-2);
}

// Émoji de statut
function getStatusEmoji(status) {
    const map = {
        'pending': '⏳',
        'success': '✅',
        'expired': '⏰',
        'cancelled': '❌',
        'paid': '✅',
        'EN ATT': '⏳'
    };
    return map[status] || '❓';
}

// Générer un numéro de commande
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}${random}`;
}

// Vérifier si l'utilisateur est admin
async function isAdmin(telegramId) {
    const user = await getUser(telegramId);
    return user && user.isAdmin;
}

module.exports = {
    getUser,
    updateBalance,
    formatPrice,
    maskPhone,
    getStatusEmoji,
    generateOrderNumber,
    isAdmin
};