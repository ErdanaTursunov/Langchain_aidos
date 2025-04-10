const searchByAuthorTitle = require("../services/searchByAuthorTitle");
const searchByDescription = require("../services/searchByDescription");

class BookController {
  static async searchBooks(req, res) {
    try {
      const { author = "", title = "", query = "", exactAuthorMatch = true } = req.body;

      let books = [];

      if (title || author) {
        books = await searchByAuthorTitle(author, title, exactAuthorMatch);
      } else {
        console.log("Выполняем поиск по query:", query);

        // Проверяем, содержит ли запрос разделители
        if (query && (query.includes(' и ') || query.includes(' или '))) {
          // Разбиваем запрос на отдельные темы
          const searchTerms = query.split(/\s+(?:и|или)\s+/).map(term => term.trim()).filter(Boolean);
          console.log("Поиск по отдельным темам:", searchTerms);

          if (query.includes(' и ')) {
            // Для поиска с 'и' используем новую функцию, которая ищет все термины сразу
            console.log("Выполняем AND-поиск по всем критериям:", searchTerms);
            
            // Выполняем поиск по описанию с массивом терминов
            const booksByDescription = await searchByDescription(searchTerms);
            books = booksByDescription;
          } else {
            // Для поиска с 'или' используем прежний подход - ищем по каждому термину отдельно
            let allBooks = new Map();

            // Выполняем поиск для каждой темы отдельно
            for (const term of searchTerms) {
              if (term) {
                console.log("Поиск по теме:", term);
                
                // Выполняем поиск по описанию для каждого термина
                const termBooksByDescription = await searchByDescription(term);

                // Добавляем найденные книги в общий Map
                termBooksByDescription.forEach(book => {
                  if (!allBooks.has(book.BR_ID)) {
                    allBooks.set(book.BR_ID, book);
                  }
                });
              }
            }

            // Преобразуем Map в массив
            books = Array.from(allBooks.values());
            console.log(`Всего найдено уникальных книг: ${books.length}`);
          }
        } else {
          // Стандартный поиск по одному запросу
          books = await searchByDescription(query);
        }
      }

      if (typeof res.json === 'function') {
        return res.json({ books });
      } else {
        // Для случая, когда res - это mock объект из ChatController
        res.json({ books });
      }
    } catch (error) {
      console.error("Ошибка при поиске книг:", error);
      if (typeof res.status === 'function') {
        return res.status(500).json({ error: "Ошибка сервера" });
      } else {
        // Для случая, когда res - это mock объект из ChatController
        res.json({ error: "Ошибка сервера", books: [] });
      }
    }
  }
}

module.exports = BookController;
