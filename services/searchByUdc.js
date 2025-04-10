const sequelize = require("../db");
const searchByUdcTopic = require("./searchByUdcTopic");

async function searchByUdc(topic) {
  try {
    // 🔹 Шаг 1: Ищем TITLE_INDEX_GI по MAIN_TOPIC
    const titleIndices = await searchByUdcTopic(topic);

    if (titleIndices.length === 0) {
      console.log('⚠️ Индексы UDC не найдены');
      return []; 
    }

    console.log('📊 Найденные индексы UDC:', titleIndices);

    // 🔹 Шаг 2: Для каждого индекса ищем книги
    let allBooks = [];
    console.time('⏱️ Время поиска книг');
    
    for (const index of titleIndices) {
      // Очищаем индекс от кавычек
      const cleanIndex = index.replace(/^'|'$/g, '');
      console.log(`🧹 Очищенный индекс: '${index}' → '${cleanIndex}'`);
      
      // Используем очищенный индекс в запросе
      let records = [];
      try {
        const recordsQuery = `
          SELECT * FROM public."_BR_RECORD"
          WHERE "VALUE" LIKE '''${cleanIndex}%'
          ORDER BY 
            CASE 
              WHEN "VALUE" = '''${cleanIndex}''' THEN 1  -- Точное совпадение
              WHEN "VALUE" LIKE '''${cleanIndex}%' THEN 2  -- Начинается с индекса
              ELSE 3  -- Другие совпадения
            END,
            LENGTH("VALUE"), "VALUE"
          LIMIT 10;
        `;
        
        console.log(`🔍 Поиск для индекса '${cleanIndex}'`);
        
        records = await sequelize.query(recordsQuery, {
          type: sequelize.QueryTypes.SELECT,
        });
      } catch (error) {
        console.error(`❌ Ошибка при запросе записей: ${error.message}`);
        
        // Простой запрос без сложной сортировки
        try {
          const fallbackQuery = `
            SELECT * FROM public."_BR_RECORD"
            WHERE "VALUE" LIKE '''${cleanIndex}%'
            LIMIT 10;
          `;
          
          console.log(`🔄 Используем запасной запрос для индекса '${cleanIndex}'`);
          records = await sequelize.query(fallbackQuery, {
            type: sequelize.QueryTypes.SELECT,
          });
        } catch (fallbackError) {
          console.error(`❌ Ошибка в запасном запросе: ${fallbackError.message}`);
          continue; // Переходим к следующему индексу
        }
      }
      
      console.log(`📚 Найдено ${records.length} записей для индекса '${cleanIndex}'`);
      
      // Для каждой записи получаем информацию о книге
      if (records.length > 0) {
        const bookIds = records.map(record => record.BR_ID);
        
        // Если есть ID книг, получаем информацию о них
        if (bookIds.length > 0) {
          // Добавляем CAST к каждому ID для правильного сравнения типов
          const castBookIds = bookIds.map(id => `CAST('${id}' AS VARCHAR)`).join(',');
          
          try {
            const booksQuery = `
              SELECT "TITLE", "AUTHOR", "BR_ID"
              FROM "_BR"
              WHERE "BR_ID"::VARCHAR IN (${castBookIds})
              AND "TITLE" IS NOT NULL 
              AND "TITLE" <> '' 
              AND "TITLE" <> ''''
              ORDER BY 
                "BR_ID",
                CASE 
                  WHEN "AUTHOR" ILIKE :topic THEN 1  -- Совпадение с темой в авторе
                  WHEN "TITLE" ILIKE :topic THEN 2  -- Совпадение с темой в названии
                  ELSE 3  -- Другие книги
                END,
                LENGTH("TITLE") ASC
              LIMIT 20;
            `;
            
            const books = await sequelize.query(booksQuery, {
              replacements: { topic: `%${topic}%` },
              type: sequelize.QueryTypes.SELECT,
            });
            
            console.log(`📚 Найдено ${books.length} книг для индекса '${cleanIndex}'`);
            allBooks = [...allBooks, ...books];
          } catch (error) {
            console.error(`❌ Ошибка при получении книг: ${error.message}`);
            
            // Простой запрос без сложной сортировки
            try {
              const simpleBooksQuery = `
                SELECT "TITLE", "AUTHOR", "BR_ID"
                FROM "_BR"
                WHERE "BR_ID"::VARCHAR IN (${castBookIds})
                AND "TITLE" IS NOT NULL 
                AND "TITLE" <> '' 
                AND "TITLE" <> ''''
                ORDER BY "BR_ID"
                LIMIT 20;
              `;
              
              console.log(`🔄 Используем запасной запрос для книг`);
              const books = await sequelize.query(simpleBooksQuery, {
                type: sequelize.QueryTypes.SELECT,
              });
              
              console.log(`📚 Найдено ${books.length} книг (запасной запрос) для индекса '${cleanIndex}'`);
              allBooks = [...allBooks, ...books];
            } catch (fallbackError) {
              console.error(`❌ Ошибка в запасном запросе книг: ${fallbackError.message}`);
            }
          }
        }
      }
    }
    
    // Убираем дубликаты книг
    const uniqueBooks = [];
    const bookIds = new Set();
    
    for (const book of allBooks) {
      if (!bookIds.has(book.BR_ID)) {
        bookIds.add(book.BR_ID);
        uniqueBooks.push(book);
      }
    }
    
    console.timeEnd('⏱️ Время поиска книг');
    console.log(`📚 Итого найдено уникальных книг: ${uniqueBooks.length}`);

    return uniqueBooks;
  } catch (error) {
    console.error("❌ Ошибка в searchByUdc:", error);
    throw error;
  }
}

module.exports = searchByUdc;
