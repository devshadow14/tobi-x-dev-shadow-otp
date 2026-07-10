// models/Number.js
module.exports = (sequelize, DataTypes) => {
    const Number = sequelize.define('Number', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
            allowNull: false,
            unique: true
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        isAvailable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        server: {
            type: DataTypes.STRING(10),
            defaultValue: 'S1'
        }
    }, {
        timestamps: true
    });
    return Number;
};