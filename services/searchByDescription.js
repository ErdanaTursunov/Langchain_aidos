const sequelize = require("../db");

/**
 * Функция поиска книг по нескольким критериям описания
 * @param {string|string[]} descriptions - Строка или массив строк для поиска
 * @returns {Promise<Array>} - Массив найденных книг
 */
async function searchByDescription(descriptions) {
  try {
    // Преобразуем в массив, если передана строка
    const searchTerms = Array.isArray(descriptions) ? descriptions : [descriptions];
    
    // Если массив пустой, вернуть пустой результат
    if (searchTerms.length === 0) {
      return [];
    }
    
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

    // Получаем основную строку запроса (первый элемент массива)
    const mainQuery = searchTerms[0];
    let query = '';
    let replacements = {};

    // Формируем запрос с двумя подходами: поиск точной фразы и поиск по отдельным словам
    if (mainQuery) {
      // Разбиваем запрос на отдельные слова
      const queryWords = mainQuery.split(/\s+/).filter(word => word.length > 1);
      
      // Готовим условия для поиска по отдельным словам (если их больше одного)
      let wordConditions = [];
      
      if (queryWords.length > 1) {
        // 1. Условие для поиска точной фразы
        const exactPhrase = `%${mainQuery}%`;
        replacements.exactPhrase = exactPhrase;
        const normalizedExactPhrase = `%${normalizeKazakh(mainQuery)}%`;
        replacements.normalizedExactPhrase = normalizedExactPhrase;
        
        // 2. Условия для поиска отдельных слов
        queryWords.forEach((word, index) => {
          replacements[`word${index}`] = `%${word}%`;
          const normalizedWord = normalizeKazakh(word);
          if (normalizedWord !== word) {
            replacements[`normalizedWord${index}`] = `%${normalizedWord}%`;
            wordConditions.push(`(r${index}."VALUE" COLLATE "en_US.UTF-8" ILIKE :word${index} OR r${index}."VALUE" COLLATE "en_US.UTF-8" ILIKE :normalizedWord${index})`);
          } else {
            wordConditions.push(`r${index}."VALUE" COLLATE "en_US.UTF-8" ILIKE :word${index}`);
          }
        });
        
        // Формируем запрос, который ищет книги и сортирует их по релевантности:
        // 1) Сначала точные совпадения фразы
        // 2) Затем книги, где есть все слова из запроса
        query = `
          SELECT DISTINCT b."TITLE", b."AUTHOR", b."BR_ID",
          CASE
            WHEN EXISTS (
              SELECT 1 FROM "_BR_RECORD" r_exact
              WHERE r_exact."BR_ID" = b."BR_ID"
              AND (r_exact."VALUE" COLLATE "en_US.UTF-8" ILIKE :exactPhrase 
                  OR r_exact."VALUE" COLLATE "en_US.UTF-8" ILIKE :normalizedExactPhrase)
            ) THEN 0
            ELSE 1
          END as relevance_score
          FROM "_BR" b
          WHERE b."TITLE" IS NOT NULL 
            AND b."TITLE" <> '' 
            AND b."TITLE" <> ''''
            AND (
              -- Поиск по точной фразе
              EXISTS (
                SELECT 1 FROM "_BR_RECORD" r_phrase
                WHERE r_phrase."BR_ID" = b."BR_ID"
                AND (r_phrase."VALUE" COLLATE "en_US.UTF-8" ILIKE :exactPhrase 
                    OR r_phrase."VALUE" COLLATE "en_US.UTF-8" ILIKE :normalizedExactPhrase)
              )
              OR
              -- Поиск по всем словам одновременно
              (
                ${queryWords.map((word, index) => `
                  EXISTS (
                    SELECT 1 FROM "_BR_RECORD" r${index}
                    WHERE r${index}."BR_ID" = b."BR_ID"
                    AND ${wordConditions[index]}
                  )
                `).join(' AND ')}
              )
            )
          ORDER BY relevance_score, b."AUTHOR", b."TITLE"
          LIMIT 10;
        `;
      } else {
        // Если всего одно слово, используем стандартный поиск
        replacements.query = `%${mainQuery}%`;
        const normalizedQuery = normalizeKazakh(mainQuery);
        
        if (normalizedQuery !== mainQuery) {
          replacements.normalizedQuery = `%${normalizedQuery}%`;
          
          query = `
            SELECT DISTINCT b."TITLE", b."AUTHOR", b."BR_ID"
            FROM "_BR" b
            WHERE b."TITLE" IS NOT NULL 
              AND b."TITLE" <> '' 
              AND b."TITLE" <> ''''
              AND EXISTS (
                SELECT 1 FROM "_BR_RECORD" r
                WHERE r."BR_ID" = b."BR_ID"
                AND (r."VALUE" COLLATE "en_US.UTF-8" ILIKE :query 
                    OR r."VALUE" COLLATE "en_US.UTF-8" ILIKE :normalizedQuery)
              )
            ORDER BY b."AUTHOR", b."TITLE"
            LIMIT 30;
          `;
        } else {
          query = `
            SELECT DISTINCT b."TITLE", b."AUTHOR", b."BR_ID"
            FROM "_BR" b
            WHERE b."TITLE" IS NOT NULL 
              AND b."TITLE" <> '' 
              AND b."TITLE" <> ''''
              AND EXISTS (
                SELECT 1 FROM "_BR_RECORD" r
                WHERE r."BR_ID" = b."BR_ID"
                AND r."VALUE" COLLATE "en_US.UTF-8" ILIKE :query
              )
            ORDER BY b."AUTHOR", b."TITLE"
            LIMIT 30;
          `;
        }
      }
    } else {
      // Если нет основного запроса, возвращаем пустой результат
      return [];
    }
    
    console.log('Поиск по запросу:', mainQuery);
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
      AUTHOR: book.AUTHOR ? book.AUTHOR.replace(/^'|'$/g, '') : book.AUTHOR,
      // Удаляем поле relevance_score если оно есть
      relevance_score: undefined
    }));

    console.log('Результаты поиска:', cleanResults);
    return cleanResults;
  } catch (error) {
    console.error("Ошибка в searchByDescription:", error);
    throw error;
  }
}

module.exports = searchByDescription; 