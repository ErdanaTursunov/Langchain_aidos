const sequelize = require("../db");

async function searchByUdcTopic(topic) {
  try {
    console.log('\n===== Поиск по UDC теме =====');
    console.log('📝 Тема поиска:', topic);
    
    // Первая буква заглавная для лучшего поиска
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase();
    
    // Поиск UDC кодов по теме с улучшенной сортировкой
    let query = `
      SELECT "TITLE_INDEX_GI", "MAIN_TOPIC"
      FROM "_UDC"
      WHERE "MAIN_TOPIC" COLLATE "en_US.UTF-8" ILIKE :topic
      ORDER BY 
        CASE 
          WHEN "MAIN_TOPIC" COLLATE "en_US.UTF-8" = :exactTopic THEN 1  -- Точное совпадение
          WHEN "MAIN_TOPIC" COLLATE "en_US.UTF-8" LIKE :topicStart THEN 2  -- Начинается с темы
          WHEN "MAIN_TOPIC" COLLATE "en_US.UTF-8" LIKE :topicEnd THEN 3  -- Заканчивается на тему
          ELSE 4  -- Содержит тему где-то в середине
        END,
        LENGTH("MAIN_TOPIC") ASC  -- Более короткие темы сначала
      LIMIT 10
    `;
    
    const replacements = { 
      topic: `%${capitalizedTopic}%`,
      exactTopic: capitalizedTopic,
      topicStart: `${capitalizedTopic}%`,
      topicEnd: `%${capitalizedTopic}`
    };
    
    console.log('🔍 SQL запрос:', query);
    console.log('📊 Параметры:', replacements);
    
    let udcResults;
    try {
      udcResults = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("❌ Ошибка в основном запросе searchByUdcTopic:", error);
      
      // Резервный запрос без сложной сортировки
      const fallbackQuery = `
        SELECT "TITLE_INDEX_GI", "MAIN_TOPIC"
        FROM "_UDC"
        WHERE "MAIN_TOPIC" COLLATE "en_US.UTF-8" ILIKE :topic
        ORDER BY "MAIN_TOPIC"
        LIMIT 10
      `;
      
      console.log('🔍 Выполняем резервный запрос');
      udcResults = await sequelize.query(fallbackQuery, {
        replacements: { topic: `%${capitalizedTopic}%` },
        type: sequelize.QueryTypes.SELECT,
      });
    }
    
    console.log('📊 Найдено UDC записей:', udcResults.length);
    
    if (udcResults.length === 0) {
      return [];
    }
    
    // Извлекаем значение из формата ('XXX')
    const titleIndices = udcResults
      .map((row) => {
        const title = row.TITLE_INDEX_GI?.trim();
        if (!title) return null;
        
        // Извлекаем значение из формата ('XXX')
        const match = title.match(/\('([^']+)'/);
        if (match) {
          return match[1].trim(); // Возвращаем значение внутри кавычек
        }
        
        return title;
      })
      .filter(Boolean);
    
    console.log('📊 Обработанные индексы:', titleIndices);
    
    return titleIndices;
  } catch (error) {
    console.error("❌ Ошибка в searchByUdcTopic:", error);
    throw error;
  }
}

module.exports = searchByUdcTopic;
