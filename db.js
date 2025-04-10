require('dotenv').config();
const { Sequelize } = require("sequelize");

// Конфигурация подключения
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.USER,
  process.env.PASSWORD,
  {
    host: process.env.HOST,
    dialect: "postgres",
    port: 5432,
    logging: false // отключаем логи SQL запросов для чистоты вывода
  }
);

// Проверка подключения
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Успешное подключение к базе данных');
  } catch (error) {
    console.error('Ошибка подключения к базе данных:', error);
  }
}

testConnection();

module.exports = sequelize;