/**
 * Модель для работы с историей чатов
 * @module Chats
 */

const sequelize = require("../db");
const { DataTypes } = require("sequelize");

// Определение модели чата
const Chat = sequelize.define('chat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'session_id'
  },
  userMessage: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'user_message'
  },
  botResponse: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'bot_response'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'chats',
  timestamps: false // Используем свое поле created_at
});

// Инициализация таблицы, если она не существует
(async () => {
  try {
    await Chat.sync();
    console.log('Таблица чатов синхронизирована');
  } catch (error) {
    console.error('Ошибка при синхронизации таблицы чатов:', error);
  }
})();

/**
 * Сохранение сообщения и ответа в историю чата
 * @param {string} sessionId - Идентификатор сессии пользователя
 * @param {string} userMessage - Сообщение пользователя
 * @param {string} botResponse - Ответ бота (может быть в формате JSON)
 * @returns {Promise<Object>} - Созданная запись в базе данных
 */
async function saveChat(sessionId, userMessage, botResponse) {
  try {
    return await Chat.create({
      sessionId,
      userMessage,
      botResponse
    });
  } catch (error) {
    console.error('Ошибка при сохранении чата:', error);
    throw error;
  }
}

/**
 * Получение истории чата для заданной сессии
 * @param {string} sessionId - Идентификатор сессии пользователя
 * @returns {Promise<Array>} - Массив сообщений из истории чата
 */
async function getChats(sessionId) {
  try {
    const chats = await Chat.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']], // Сортировка по времени создания
      raw: true // Получить только данные без метаданных Sequelize
    });
    
    // Преобразуем JSON-строки в объекты
    return chats.map(chat => ({
      ...chat,
      botResponse: tryParseJSON(chat.botResponse)
    }));
  } catch (error) {
    console.error('Ошибка при получении истории чата:', error);
    throw error;
  }
}

/**
 * Попытка преобразовать строку в JSON-объект
 * @param {string} jsonString - Строка в формате JSON
 * @returns {Object|string} - Объект, если строка была корректным JSON, или исходная строка
 */
function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return jsonString;
  }
}

module.exports = {
  Chat,
  saveChat,
  getChats
};