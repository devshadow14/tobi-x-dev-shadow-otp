// models/Order.js
module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        service: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'success', 'expired', 'cancelled'),
            defaultValue: 'pending'
        },
        otpCode: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        orderNumber: {
            type: DataTypes.STRING(20),
            allowNull: true
        }
    }, {
        timestamps: true
    });
    return Order;
};