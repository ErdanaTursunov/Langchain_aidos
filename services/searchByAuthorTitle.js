const sequelize = require("../db");

/**
 * Функция поиска книг по автору и названию с поддержкой нечеткого поиска
 * @param {string} author - Автор книги (или его часть)
 * @param {string} title - Название книги (или его часть)
 * @param {boolean} exactAuthorMatch - Искать точное совпадение автора по словам
 * @returns {Promise<Array>} - Массив найденных книг
 */
async function searchByAuthorTitle(author, title, exactAuthorMatch = true) {
  try {
    console.log('Поиск по автору:', author, 'названию:', title, 'точный поиск:', exactAuthorMatch);
    
    let query = `
      SELECT DISTINCT b."TITLE", b."AUTHOR", b."BR_ID"
    `;
    
    // Если есть поиск по автору и нужна сортировка, добавляем выражение сортировки в SELECT
    if (author) {
      query = `
        SELECT DISTINCT b."TITLE", b."AUTHOR", b."BR_ID"
      `;
    }
    
    query += `
      FROM "_BR" b
      WHERE 1=1
      AND b."TITLE" IS NOT NULL 
      AND b."TITLE" <> '' 
      AND b."TITLE" <> ''''
    `;
    
    let replacements = {};

    // Преобразуем казахские буквы в русские для улучшения поиска
    const normalizeKazakh = (text) => {
      if (!text) return text;
      
      return text
        .replace(/Ұ|Ү/g, 'У')
        .replace(/ұ|ү/g, 'у')
        .replace(/Қ/g, 'К')
        .replace(/қ/g, 'к')
        .replace(/Ң/g, 'Н')
        .replace(/ң/g, 'н')
        .replace(/Ә/g, 'А')
        .replace(/ә/g, 'а')
        .replace(/Ө/g, 'О')
        .replace(/ө/g, 'о')
        .replace(/Ғ/g, 'Г')
        .replace(/ғ/g, 'г')
        .replace(/І/g, 'И')
        .replace(/і/g, 'и');
    };

    if (author) {
      if (exactAuthorMatch) {
        // Разбиваем имя автора на отдельные слова
        const authorWords = author.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (authorWords.length > 0) {
          // Улучшенная логика поиска: ищем каждое слово по отдельности через AND
          // Это позволит находить имена независимо от порядка (например, "Абай Кунанбаев" найдет "Кунанбаев Абай")
          const wordConditions = authorWords.map((word, index) => {
            // Используем слово в исходном виде без нормализации
            replacements[`word${index}`] = `%${word}%`;
            
            return `REPLACE(REPLACE(b."AUTHOR", '''', ''), '''', '') ILIKE :word${index}`;
          });
          
          // Объединяем условия для всех слов через AND
          query += ` AND (${wordConditions.join(' AND ')})`;
          
          // Если больше одного слова, добавляем сортировку по релевантности
          // Книги, где имена авторов содержат слова в точном порядке, будут выше
          if (authorWords.length > 1) {
            // Добавляем еще одну проверку на точное совпадение последовательности слов
            const exactOrderMatch = `%${author}%`;
            replacements.exactOrderMatch = exactOrderMatch;
            
            // Добавляем сортировку: сначала точные совпадения, потом все остальные
            query = query.replace('ORDER BY b."AUTHOR", b."TITLE"', 
              `ORDER BY 
                CASE WHEN REPLACE(REPLACE(b."AUTHOR", '''', ''), '''', '') ILIKE :exactOrderMatch THEN 0 ELSE 1 END,
                b."AUTHOR", b."TITLE"`);
          }
        }
      } else {
        // Обычный поиск - ищем вхождение строки в любом месте
        replacements.author = `%${author}%`;
        query += ` AND REPLACE(REPLACE(b."AUTHOR", '''', ''), '''', '') COLLATE "en_US.UTF-8" ILIKE :author`;
      }
    }
    
    if (title) {
      // Используем оригинальное название без нормализации
      // Создаем несколько вариантов запроса (с казахскими и русскими буквами)
      const normalizedTitle = normalizeKazakh(title);
      
      if (normalizedTitle !== title) {
        // Если текст содержит казахские буквы, ищем обоими способами
        replacements.titleOriginal = `%${title}%`;
        replacements.titleNormalized = `%${normalizedTitle}%`;
        
        query += ` AND (
          REPLACE(REPLACE(b."TITLE", '''', ''), '''', '') COLLATE "en_US.UTF-8" ILIKE :titleOriginal
          OR REPLACE(REPLACE(b."TITLE", '''', ''), '''', '') COLLATE "en_US.UTF-8" ILIKE :titleNormalized
        )`;
      } else {
        // Иначе ищем только по оригинальному названию
        replacements.title = `%${title}%`;
        query += ` AND REPLACE(REPLACE(b."TITLE", '''', ''), '''', '') COLLATE "en_US.UTF-8" ILIKE :title`;
      }
    }

    // Просто сортируем по автору и названию
    query += ` ORDER BY b."AUTHOR", b."TITLE"`;
    query += ` LIMIT 10;`;

    console.log('SQL запрос:', query);
    console.log('Параметры:', replacements);

    const results = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    // Очищаем результаты от кавычек перед возвратом
    const cleanResults = results.map(book => ({
      ...book,
      TITLE: book.TITLE ? book.TITLE.replace(/^'|'$/g, '') : book.TITLE,
      AUTHOR: book.AUTHOR ? book.AUTHOR.replace(/^'|'$/g, '') : book.AUTHOR
    }));

    console.log('Результаты поиска:', cleanResults);
    return cleanResults;
    
  } catch (error) {
    console.error("Ошибка в searchByAuthorTitle:", error);
    throw error;
  }
}

module.exports = searchByAuthorTitle;
