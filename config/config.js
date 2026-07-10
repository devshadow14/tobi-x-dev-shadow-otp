// config/config.js
require('dotenv').config();

module.exports = {
    botToken: process.env.BOT_TOKEN,
    adminCode: process.env.ADMIN_CODE || 'tobi x shadow',
    adminEmail: process.env.ADMIN_EMAIL || 'smsotp@gmail.com',
    whatsappNumber: process.env.WHATSAPP_NUMBER || '776227173',
    currency: process.env.CURRENCY || 'FCFA',
    port: process.env.PORT || 3000
};