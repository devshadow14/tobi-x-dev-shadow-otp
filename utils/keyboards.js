// utils/keyboards.js

// MENU PRINCIPAL
function mainMenu() {
    return {
        inline_keyboard: [
            [{ text: '🏠 Accueil', callback_data: 'home' }, { text: '📱 Numéros', callback_data: 'numbers' }],
            [{ text: '💰 Dépôts', callback_data: 'deposit' }, { text: '📋 Historique', callback_data: 'history' }],
            [{ text: '👤 Profil', callback_data: 'profile' }, { text: '🔐 Admin', callback_data: 'admin_login' }]
        ]
    };
}

// MENU ADMIN
function adminMenu() {
    return {
        inline_keyboard: [
            [{ text: '📊 Dashboard', callback_data: 'admin_dashboard' }],
            [{ text: '👥 Utilisateurs', callback_data: 'admin_users' }],
            [{ text: '📱 Numéros', callback_data: 'admin_numbers' }],
            [{ text: '💰 Dépôts', callback_data: 'admin_deposits' }],
            [{ text: '⚙️ Configuration', callback_data: 'admin_config' }],
            [{ text: '📋 Logs', callback_data: 'admin_logs' }],
            [{ text: '◀️ Retour', callback_data: 'home' }]
        ]
    };
}

// MENU UTILISATEURS ADMIN
function adminUsersMenu() {
    return {
        inline_keyboard: [
            [{ text: '➕ Ajouter un utilisateur', callback_data: 'admin_add_user' }],
            [{ text: '📋 Liste des utilisateurs', callback_data: 'admin_list_users' }],
            [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
        ]
    };
}

// MENU NUMÉROS ADMIN
function adminNumbersMenu() {
    return {
        inline_keyboard: [
            [{ text: '➕ Ajouter un numéro', callback_data: 'admin_add_number' }],
            [{ text: '📋 Liste des numéros', callback_data: 'admin_list_numbers' }],
            [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
        ]
    };
}

// MENU DÉPÔTS ADMIN
function adminDepositsMenu() {
    return {
        inline_keyboard: [
            [{ text: '⏳ Dépôts en attente', callback_data: 'admin_pending_deposits' }],
            [{ text: '📋 Historique des dépôts', callback_data: 'admin_all_deposits' }],
            [{ text: '◀️ Retour Admin', callback_data: 'admin' }]
        ]
    };
}

// BOUTON RETOUR
function backButton() {
    return {
        inline_keyboard: [
            [{ text: '◀️ Retour', callback_data: 'home' }]
        ]
    };
}

// MENU PAYS
function countryMenu() {
    const countries = ['🇫🇷 France', '🇺🇸 USA', '🇬🇧 UK', '🇨🇦 Canada', '🇩🇪 Allemagne', '🇮🇩 Indonésie'];
    const keyboard = [];
    for (let i = 0; i < countries.length; i += 2) {
        const row = [];
        for (let j = 0; j < 2 && i + j < countries.length; j++) {
            row.push({ text: countries[i + j], callback_data: `country_${i + j}` });
        }
        keyboard.push(row);
    }
    keyboard.push([{ text: '◀️ Retour', callback_data: 'numbers' }]);
    return { inline_keyboard: keyboard };
}

// MENU SERVICE
function serviceMenu() {
    const services = ['💬 WhatsApp', '✈️ Telegram', '🎵 TikTok', '📧 Gmail', '📦 Amazon', '👍 Facebook'];
    const keyboard = [];
    for (let i = 0; i < services.length; i += 2) {
        const row = [];
        for (let j = 0; j < 2 && i + j < services.length; j++) {
            row.push({ text: services[i + j], callback_data: `service_${i + j}` });
        }
        keyboard.push(row);
    }
    keyboard.push([{ text: '◀️ Retour', callback_data: 'numbers' }]);
    return { inline_keyboard: keyboard };
}

// MENU MONTANT DÉPÔT
function depositAmountMenu() {
    return {
        inline_keyboard: [
            [{ text: '1 000 FCFA', callback_data: 'deposit_1000' }, { text: '2 000 FCFA', callback_data: 'deposit_2000' }],
            [{ text: '5 000 FCFA', callback_data: 'deposit_5000' }, { text: '10 000 FCFA', callback_data: 'deposit_10000' }],
            [{ text: '◀️ Retour', callback_data: 'deposit' }]
        ]
    };
}

// MENU PAIEMENT
function paymentMenu() {
    return {
        inline_keyboard: [
            [{ text: '💬 Payer via WhatsApp', url: `https://wa.me/${process.env.WHATSAPP_NUMBER || 776227173}?text=Achat%20numéro%20OTP` }],
            [{ text: '✅ J\'ai payé', callback_data: 'paid' }],
            [{ text: '❌ Annuler', callback_data: 'cancel_payment' }]
        ]
    };
}

module.exports = {
    mainMenu,
    adminMenu,
    adminUsersMenu,
    adminNumbersMenu,
    adminDepositsMenu,
    backButton,
    countryMenu,
    serviceMenu,
    depositAmountMenu,
    paymentMenu
};