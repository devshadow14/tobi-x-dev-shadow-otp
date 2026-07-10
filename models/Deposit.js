// models/Deposit.js
module.exports = (sequelize, DataTypes) => {
    const Deposit = sequelize.define('Deposit', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        method: {
            type: DataTypes.ENUM('mobile_money', 'card', 'crypto'),
            defaultValue: 'mobile_money'
        },
        status: {
            type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
            defaultValue: 'pending'
        },
        transactionId: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    }, {
        timestamps: true
    });
    return Deposit;
};