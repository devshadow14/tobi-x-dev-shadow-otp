// models/User.js
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        telegramId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        balance: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        totalOrders: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        successfulOrders: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isBanned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        referralCode: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        referredBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        timestamps: true
    });
    return User;
};