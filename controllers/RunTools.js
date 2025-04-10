/**
 * Модуль подключения инструментов для AI-ассистента
 * @module RunTools
 */

const { searchBooks } = require('./BookController');
const { getLibraryInfo } = require('./InfoController');

/**
 * Функция обработки запроса к ассистенту библиотеки
 * @param {Object} request - Запрос пользователя
 * @param {string} request.type - Тип запроса: 'book' или 'info'
 * @param {Object} request.params - Параметры запроса
 * @returns {Promise<Object>} - Результат обработки запроса
 */
async function processRequest(request) {
  try {
    const { type, params } = request;
    
    console.log('Обработка запроса:', { type, params });
    
    // Обработка запроса на поиск книги
    if (type === 'book') {
      const { author, title, query } = params;
      return await searchBooks(author, title, query);
    }
    
    // Обработка запроса на информацию о библиотеке
    if (type === 'info') {
      const { question } = params;
      return getLibraryInfo(question);
    }
    
    // Обработка неизвестного типа запроса
    return {
      success: false,
      error: 'Неизвестный тип запроса',
      message: 'Я могу помочь найти книги или ответить на вопросы о библиотеке.'
    };
    
  } catch (error) {
    console.error('Ошибка в RunTools:', error);
    return {
      success: false,
      error: error.message,
      message: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте снова.'
    };
  }
}

module.exports = {
  processRequest
}; 