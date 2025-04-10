/**
 * Контроллер для поиска книг
 * @module BookController
 */

const searchByAuthorTitle = require('../services/searchByAuthorTitle');
const searchByDescription = require('../services/searchByDescription');

/**
 * Функция поиска книг по автору, названию или описанию
 * @param {string} author - Автор книги (опционально)
 * @param {string} title - Название книги (опционально)
 * @param {string} query - Описание или тема книги (опционально)
 * @returns {Promise<Object>} - Объект с результатами поиска
 */
async function searchBooks(author, title, query) {
  try {
    console.log('Поиск книг:', { author, title, query });
    
    let results = [];
    let searchMethod = 'Не выполнялся';
    
    // Проверка параметров для выбора метода поиска
    if ((author && author.trim()) || (title && title.trim())) {
      // Если указан автор или название, используем поиск по автору/названию
      results = await searchByAuthorTitle(author || '', title || '', true);
      searchMethod = 'По автору и названию';
      
      // Если не нашли ничего по автору и названию и есть запрос, используем поиск по описанию
      if (results.length === 0 && query && query.trim()) {
        results = await searchByDescription(query);
        searchMethod = 'По автору/названию, затем по описанию';
      }
    } else if (query && query.trim()) {
      // Используем поиск по описанию, если только есть описание
      results = await searchByDescription(query);
      searchMethod = 'По описанию';
    }
    
    console.log(`Найдено ${results.length} книг. Метод поиска: ${searchMethod}`);
    
    // Форматируем результаты для ответа
    const formattedResults = results.map(book => ({
      title: book.TITLE,
      author: book.AUTHOR,
      id: book.BR_ID
    }));
    
    return {
      success: true,
      total: formattedResults.length,
      books: formattedResults,
      searchMethod
    };
    
  } catch (error) {
    console.error("Ошибка в BookController:", error);
    return {
      success: false,
      error: error.message,
      books: []
    };
  }
}

module.exports = {
  searchBooks
}; 