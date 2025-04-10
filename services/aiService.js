/**
 * Сервис для работы с LangChain и OpenAI API
 * @module aiService
 */

require('dotenv').config();
const { ChatOpenAI } = require('@langchain/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { DynamicTool } = require('@langchain/core/tools');

// Контроллеры для поиска книг и информации о библиотеке
const { processRequest } = require('../controllers/RunTools');

// Инициализация модели OpenAI
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.MODEL_NAME || 'gpt-4o-mini',
  temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
  maxTokens: parseInt(process.env.MAX_TOKENS) || 1500,
});

// Системный промпт для ассистента библиотеки
const SYSTEM_PROMPT = `
Ты — вежливый и дружелюбный ассистент, установленный у входа в Национальную библиотеку. Твоя задача — помогать читателям находить книги и информацию о библиотеке. Ты общаешься с людьми на простом и понятном языке.

Вот твои главные правила:

1. Ты помогаешь только по теме библиотеки — рассказываешь, как найти книги, где что находится, какие разделы есть.

2. Ты не даёшь советов, не рекомендуешь книги, не рассуждаешь на абстрактные темы. Если тебя просят порекомендовать книгу — ты отвечаешь:
«Я не могу рекомендовать книги, но если вы скажете тему, я постараюсь найти книги по этой теме.»

3. Если пользователь говорит непонятно или слишком общо, ты уточняешь. Например:
• Пользователь: «Казахская история»
• Ты: «Вы хотите найти книгу по казахской истории?»

4. Если пользователь говорит о личных проблемах, целях или планах (например: "Я хочу написать эссе" или "У меня проблема с мотивацией") — ты отвечаешь:
«Я не могу помочь с этим, но могу попробовать найти книгу, которая поможет вам при написании эссе или по интересующей теме.»

5. Если тебе что-то непонятно, ты не стесняешься спросить:
«Извините, я не совсем понял. Могли бы вы переформулировать или уточнить?»

6. Ты не поддерживаешь разговоры вне темы библиотеки. Если тебя спрашивают просто значение слова или что-то не по теме — ты можешь попытаться понять, но всегда направляешь разговор обратно к поиску книги.
Например:
• Пользователь: «Что значит слово 'эссе'?»
• Ты: «Я могу попробовать понять это слово, но лучше скажите, хотите ли вы найти книгу по написанию эссе?»

7. Ты не знаешь, какие именно книги есть в библиотеке, но можешь искать книги по ключевым словам, темам или названиям. Ты всегда говоришь об этом прямо:
«Я не знаю, какие именно книги есть, но могу попробовать найти книги по указанной теме.»

8. ВАЖНО: Пошаговая логика общения по запросу книги:

Шаг 1: Понимание намерения
• Если пользователь говорит «Мне нужна книга», ты отвечаешь: «Хорошо. Чтобы помочь, мне нужно немного больше информации. Вы знаете название книги или имя автора?»

Шаг 2: Сбор данных
• Постепенно задавай вопросы, если пользователь не сказал всё сразу.
• Если пользователь сказал только тему → спроси: «Вы знаете автора или точное название книги? Или мне искать по теме?»
• Если пользователь сказал: «Книга об экономике Казахстана от Айдоса Турсунова», извлеки: автор = Айдос Турсунов, тема = экономика Казахстана

Шаг 3: Подтверждение
• Повтори собранную информацию: «Вы хотите найти книгу автора [Имя автора] по теме [Тема]. Всё верно?»
• ИСКЛЮЧЕНИЕ: Пропускай этот шаг, если запрос пользователя уже содержит достаточно информации, например: "СЛОВА НАЗИДАНИЯ Абай Кунанбаев" или "Ищу книги Абая". В таких случаях переходи сразу к шагу 4.

Шаг 4: Вызов инструмента поиска
• После подтверждения (или сразу, если информация полная) используй инструмент searchBooks с правильными параметрами.

Примеры запросов, которые содержат полную информацию и НЕ требуют уточнения:
• "СЛОВА НАЗИДАНИЯ Абай Кунанбаев" → Название: СЛОВА НАЗИДАНИЯ, Автор: Абай Кунанбаев
• "Ищу книги Абая" → Автор: Абай
• "История Казахстана" → Тема: История Казахстана
• "Нужна книга Война и мир Толстого" → Название: Война и мир, Автор: Толстой

Твоя цель — быть полезным, вежливым и понятным. Ты — помощник в библиотеке, а не эксперт по жизни. Всегда направляй разговор к теме поиска книг.

ВНИМАНИЕ: Когда пользователь ищет книгу с полной информацией, не начинай собирать информацию заново. Используй инструмент searchBooks сразу с имеющимися данными.
`;

/**
 * Нормализация имени автора (преобразование из падежной формы в именительный падеж)
 * @param {string} name - Имя автора в любом падеже
 * @returns {string} - Нормализованное имя автора
 */
function normalizeAuthorName(name) {
  if (!name) return '';
  
  // Словарь для простых окончаний родительного падежа
  const endingsMap = {
    'ова': 'ов',
    'ева': 'ев',
    'ина': 'ин',
    'ого': 'ий',
    'его': 'ий',
    'кого': 'кий',
    'ича': 'ич',
    'ая': '',
    'ию': 'ий',
    'ых': '',
    'их': ''
  };
  
  // Проверяем известные авторские имена отдельно
  const knownAuthors = {
    'абая': 'абай',
    'пушкина': 'пушкин',
    'толстого': 'толстой',
    'достоевского': 'достоевский',
    'чехова': 'чехов',
    'гоголя': 'гоголь',
    'тургенева': 'тургенев',
    'лермонтова': 'лермонтов',
    'кунанбаева': 'кунанбаев',
    'ауэзова': 'ауэзов',
    'муканова': 'муканов',
    'жансугурова': 'жансугуров',
    'абая кунанбаева': 'абай кунанбаев'
  };
  
  // Сначала проверяем на известные имена целиком
  const lowerName = name.toLowerCase();
  if (knownAuthors[lowerName]) {
    return capitalizeWords(knownAuthors[lowerName]);
  }
  
  // Делим имя на части и обрабатываем каждую часть
  const parts = name.split(/\s+/);
  const normalizedParts = parts.map(part => {
    const lowerPart = part.toLowerCase();
    
    // Проверяем, есть ли часть в словаре известных авторов
    if (knownAuthors[lowerPart]) {
      return capitalizeWords(knownAuthors[lowerPart]);
    }
    
    // Проверяем окончания
    for (const [ending, replacement] of Object.entries(endingsMap)) {
      if (lowerPart.endsWith(ending)) {
        const stem = lowerPart.slice(0, -ending.length);
        return capitalizeWords(stem + replacement);
      }
    }
    
    return part; // Возвращаем как есть, если не нашли замены
  });
  
  return normalizedParts.join(' ');
}

/**
 * Преобразование первых букв каждого слова в верхний регистр
 * @param {string} str - Строка для преобразования
 * @returns {string} - Строка с первыми заглавными буквами в каждом слове
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Создаем инструменты для LangChain
const searchBooksTool = new DynamicTool({
  name: "searchBooks",
  description: "Поиск книг по автору, названию или теме книги. Используй этот инструмент, когда у тебя есть достаточно информации от пользователя для поиска книг.",
  func: async (input) => {
    try {
      // Парсим входные данные
      let author = '', title = '', query = '';
      
      // Проверяем формат ввода - это может быть JSON или простой текст
      if (input.trim().startsWith('{')) {
        try {
          const params = JSON.parse(input);
          author = params.author || '';
          title = params.title || '';
          query = params.query || '';
          
          // Если есть параметр input и нет других параметров, анализируем его
          if (params.input && !author && !title && !query) {
            const parsedParams = extractSearchParams(params.input);
            author = parsedParams.author || '';
            title = parsedParams.title || '';
            query = parsedParams.query || '';
          }
        } catch (e) {
          // Если не получилось распарсить JSON, считаем что input - это простой текст запроса
          // и применяем продвинутую эвристику
          const parsedParams = extractSearchParams(input);
          author = parsedParams.author;
          title = parsedParams.title;
          query = parsedParams.query;
        }
      } else {
        // Применяем продвинутую эвристику для извлечения параметров
        const parsedParams = extractSearchParams(input);
        author = parsedParams.author;
        title = parsedParams.title;
        query = parsedParams.query;
      }
      
      // Нормализуем имя автора
      if (author) {
        author = normalizeAuthorName(author);
      }
      
      // Если указан автор, но не указан запрос, и есть заголовок,
      // добавляем заголовок в запрос для расширения поиска
      if (author && !query && title) {
        query = title;
      }
      
      console.log(`[AI Tool] Поиск книг: автор="${author}", название="${title}", тема="${query}"`);
      
      const searchResponse = await processRequest({
        type: 'book',
        params: { author, title, query }
      });
      
      if (!searchResponse.success) {
        return `Произошла ошибка при поиске книг: ${searchResponse.error || 'неизвестная ошибка'}`;
      }
      
      if (searchResponse.books.length === 0) {
        return "К сожалению, по вашему запросу ничего не найдено.";
      }
      
      // Форматируем результаты в читаемый вид
      const booksText = searchResponse.books
        .map((book, index) => `${index + 1}. "${book.title}" - ${book.author}`)
        .join('\n');
      
      return `Найдено ${searchResponse.total} книг:\n\n${booksText}`;
    } catch (error) {
      console.error('[AI Tool] Ошибка в функции searchBooks:', error);
      return `Произошла ошибка при поиске книг: ${error.message}`;
    }
  }
});

const getLibraryInfoTool = new DynamicTool({
  name: "getLibraryInfo",
  description: "Получение информации о библиотеке, такой как расположение, часы работы, правила, и т.д. Вызывай эту функцию, когда пользователь спрашивает информацию о библиотеке.",
  func: async (question) => {
    try {
      console.log(`[AI Tool] Запрос информации о библиотеке: "${question}"`);
      
      const infoResponse = await processRequest({
        type: 'info',
        params: { question }
      });
      
      if (!infoResponse.success) {
        return `К сожалению, у меня нет информации по этому вопросу: ${infoResponse.error || 'информация отсутствует'}`;
      }
      
      return infoResponse.info;
    } catch (error) {
      console.error('[AI Tool] Ошибка в функции getLibraryInfo:', error);
      return `Произошла ошибка при получении информации: ${error.message}`;
    }
  }
});

// Создаем набор инструментов
const tools = [searchBooksTool, getLibraryInfoTool];

// Создаем агента с помощью initializeAgentExecutorWithOptions
let agentExecutor = null;

/**
 * Инициализация агента (отдельная функция для ленивой инициализации)
 */
async function initAgent() {
  if (!agentExecutor) {
    agentExecutor = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: "openai-functions",
      verbose: true,
      returnIntermediateSteps: true,
      agentArgs: {
        prefix: SYSTEM_PROMPT
      }
    });
  }
  return agentExecutor;
}

/**
 * Обработка сообщения пользователя
 * @param {string} message - Сообщение пользователя
 * @param {string} sessionId - Идентификатор сессии пользователя
 * @returns {Promise<Object>} - Результат обработки сообщения
 */
async function processMessage(message, sessionId) {
  try {
    console.log(`[AI Service] Обработка сообщения от сессии ${sessionId}: "${message}"`);
    
    // Инициализируем агента, если еще не инициализирован
    const executor = await initAgent();
    
    // Запускаем агента
    const result = await executor.invoke({
      input: message,
    });
    
    console.log('[AI Service] Результат выполнения агента:', JSON.stringify(result, null, 2));
    
    // Формируем шаги выполнения для логирования
    const steps = result.intermediateSteps?.map(step => ({
      tool: step.action.tool,
      input: step.action.toolInput,
      output: step.observation
    })) || [];
    
    // Возвращаем результат
    return {
      message: result.output,
      steps: steps
    };
  } catch (error) {
    console.error('[AI Service] Ошибка при обработке сообщения:', error);
    throw error;
  }
}

/**
 * Функция для извлечения параметров поиска из свободного текста
 * @param {string} text - Текст запроса пользователя
 * @returns {Object} - Извлеченные параметры: автор, название, тема
 */
function extractSearchParams(text) {
  // Начальные значения
  let author = '', title = '', query = '';
  
  if (!text) return { author, title, query };
  
  const textLower = text.toLowerCase();
  
  // Шаблон для поиска формата "Название книги Имя Автора"
  // Ищем случаи, когда первые слова НАПИСАНЫ ЗАГЛАВНЫМИ БУКВАМИ (название книги), 
  // за которыми следуют слова с первой заглавной буквы (имя автора)
  const bookTitleAuthorPattern = /^([А-ЯЁA-Z\s]+)\s+([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+)*)/;
  const titleAuthorMatch = text.match(bookTitleAuthorPattern);
  
  if (titleAuthorMatch) {
    const potentialTitle = titleAuthorMatch[1].trim();
    const potentialAuthor = titleAuthorMatch[2].trim();
    
    // Проверяем, что потенциальный автор не является географическим названием
    const authorLower = potentialAuthor.toLowerCase();
    if (!['казахстан', 'россия', 'европа', 'азия', 'америка', 'украина', 'беларусь'].includes(authorLower) &&
        !authorLower.includes('истор') && 
        !authorLower.includes('книг')) {
      
      // Если название короткое (2-3 слова) и автор похож на имя человека
      if (potentialTitle.split(/\s+/).length <= 3 && 
          /^[А-ЯЁA-Z][а-яёa-z]+(\s+[А-ЯЁA-Z][а-яёa-z]+)?$/.test(potentialAuthor)) {
        title = potentialTitle;
        author = potentialAuthor;
        console.log(`[AI Tool] Извлечено название книги и автор из формата "Название Автор": title="${title}", author="${author}"`);
        return { author, title, query };
      }
    }
  }
  
  // Шаблон для поиска формата "Название Автор" без учета регистра
  // Для случаев типа "Избранные стихи Абай Кунанбаев"
  else if (!author && !title) {
    // Разделяем текст на 2 части - первая потенциальное название, последнее слово или два - автор
    const words = text.trim().split(/\s+/);
    if (words.length >= 3) {
      const lastTwoWords = words.slice(-2).join(' ');
      const titlePart = words.slice(0, -2).join(' ');
      
      // Проверяем, что последние два слова похожи на имя
      if (/^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+$/i.test(lastTwoWords)) {
        const potentialAuthor = lastTwoWords;
        const authorLower = potentialAuthor.toLowerCase();
        
        // Проверяем, что это не географическое название
        if (!['казахстан', 'россия', 'европа', 'азия', 'америка', 'украина', 'беларусь'].includes(authorLower) &&
            !authorLower.includes('истор') && 
            !authorLower.includes('книг')) {
          author = potentialAuthor;
          title = titlePart;
          console.log(`[AI Tool] Извлечено название книги и автор из простого формата: title="${title}", author="${author}"`);
          return { author, title, query };
        }
      }
    }
  }
  
  // Проверяем на типичные тематические запросы
  const commonTopics = [
    'история', 'литература', 'экономика', 'философия', 'психология', 
    'медицина', 'биология', 'физика', 'химия', 'математика', 'право',
    'искусство', 'наука', 'политика', 'социология', 'геология', 
    'география', 'астрономия', 'религия', 'культура', 'лингвистика'
  ];
  
  // Если запрос состоит из общеизвестной темы и, возможно, географического названия,
  // то это скорее всего тематический запрос целиком
  for (const topic of commonTopics) {
    if (textLower.includes(topic) && 
       (textLower.includes('казахстан') || 
        textLower.includes('россия') || 
        textLower.includes('европ') || 
        textLower.includes('азия') || 
        textLower.includes('америк') || 
        textLower.includes('восток') || 
        textLower.includes('запад') ||
        textLower.includes('мир'))) {
      query = text.trim();
      return { author: '', title: '', query };
    }
  }
  
  // Проверяем на простой тематический запрос
  for (const topic of commonTopics) {
    if (textLower.includes(topic)) {
      // Нашли тематику, но проверим есть ли явные указания на автора или название
      const hasAuthorMarker = textLower.includes('автор') || 
                             textLower.includes('писат') || 
                             textLower.includes('написал');
      
      const hasTitleMarker = textLower.includes('название') || 
                            textLower.includes('заголовок') || 
                            (text.includes('"') || text.includes('«'));
      
      // Если нет явных маркеров автора или названия, считаем тематическим запросом
      if (!hasAuthorMarker && !hasTitleMarker) {
        query = text.trim();
        return { author: '', title: '', query };
      }
    }
  }
  
  // Если дошли до этого места, применяем стандартную логику извлечения параметров
  
  // Извлечение автора
  
  // Шаблон 1: "автор: [имя]" или "автора [имя]"
  let authorMatch = text.match(/(?:автор[а]?[\s:]+)([^\.]+?)(?=[,\.\?]|$)/i);
  if (authorMatch && authorMatch[1]) {
    author = authorMatch[1].trim();
  } 
  // Шаблон 2: "от [имя]" или "написал [имя]"
  else if (!author) {
    authorMatch = text.match(/(?:от|написал[а]?)[\s:]+([^\.]+?)(?=[,\.\?]|$)/i);
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1].trim();
    }
  }
  // Шаблон 3: "книги [имя]" или "книгу [имя]" или "произведения [имя]"
  else if (!author) {
    authorMatch = text.match(/(?:книги|книгу|произведения)[\s:]+([^\.]+?)(?=[,\.\?]|$)/i);
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1].trim();
    }
  }
  // Шаблон 4: "ищу книги [имя]" - для запросов типа "Ищу книги Абай Кунанбаев"
  else if (!author) {
    authorMatch = text.match(/(?:найди|ищи|ищу|поиск\w*)\s+книги\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i);
    if (authorMatch && authorMatch[1]) {
      author = authorMatch[1].trim();
    }
  }
  // Шаблон 5: для запросов в формате "Абай Кунанбаев" без явных маркеров (просто имя)
  else if (!author) {
    authorMatch = text.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)\s*$/i);
    if (authorMatch && authorMatch[1]) {
      const potentialAuthor = authorMatch[1].trim();
      const potentialAuthorLower = potentialAuthor.toLowerCase();
      // Проверяем, что это не географическое название и не ключевое слово
      if (!['казахстан', 'россия', 'европа', 'азия', 'америка', 'украина', 'беларусь'].includes(potentialAuthorLower) &&
          !potentialAuthorLower.includes('истор') && 
          !potentialAuthorLower.includes('книг')) {
        author = potentialAuthor;
        console.log(`[AI Tool] Извлечено имя автора из простого запроса: author="${author}"`);
      }
    }
  }
  
  // Извлечение названия книги
  
  // Шаблон 1: "название: [название]" или "заголовок: [название]"
  let titleMatch = text.match(/(?:название|заголовок)[\s:]+([^\.]+?)(?=[,\.\?]|$)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }
  // Шаблон 2: текст в кавычках
  else if (!title) {
    titleMatch = text.match(/[«""]([^«""]+)[»""]/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  }
  
  // Извлечение темы
  
  // Шаблон 1: "о [теме]" или "об [теме]" или "про [тему]"
  let queryMatch = text.match(/(?:о|об|про)[\s:]+([^\.]+?)(?=[,\.\?]|$)/i);
  if (queryMatch && queryMatch[1]) {
    query = queryMatch[1].trim();
  }
  // Шаблон 2: "тема: [тема]" или "по теме [тема]" 
  else if (!query) {
    queryMatch = text.match(/(?:тема|по теме)[\s:]+([^\.]+?)(?=[,\.\?]|$)/i);
    if (queryMatch && queryMatch[1]) {
      query = queryMatch[1].trim();
    }
  }
  // Шаблон 3: если ничего не найдено и нет автора/названия, 
  // используем весь текст как тему, если он содержит ключевые слова о тематиках
  else if (!query && !author && !title) {
    const input_lower = text.trim().toLowerCase();
    if (input_lower.includes('истор') || 
        input_lower.includes('наук') || 
        input_lower.includes('литератур') ||
        input_lower.includes('казах') ||
        input_lower.includes('поэ') ||
        input_lower.includes('искусств') ||
        input_lower.includes('эконом') ||
        input_lower.includes('социолог') ||
        input_lower.includes('психолог') ||
        input_lower.includes('философ') ||
        input_lower.includes('юрид') ||
        input_lower.includes('медиц') ||
        input_lower.includes('математ') ||
        input_lower.includes('физик') ||
        input_lower.includes('химия') ||
        input_lower.includes('биолог')) {
      query = text.trim();
    }
  }
  
  // Если автор не найден но есть имя с заглавной буквы 
  // и оно не является частью запроса и не в начале предложения
  // и не является названием страны/региона
  if (!author && !query) {
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      if (/^[А-ЯЁA-Z][а-яёa-z]+$/.test(words[i]) && 
          !query.includes(words[i]) &&
          !title.includes(words[i])) {
        // Проверяем, не является ли слово частью ключевых слов запросов или географическим названием
        const word = words[i].toLowerCase();
        if (!['книга', 'книгу', 'книги', 'автор', 'автора', 'название', 'тема', 'теме',
              'казахстан', 'россия', 'европа', 'азия', 'америка', 'украина', 'беларусь', 
              'восток', 'запад', 'север', 'юг', 'мир'].includes(word)) {
          author = words[i];
          // Если следующее слово тоже с заглавной буквы, добавляем его к автору
          if (i + 1 < words.length && /^[А-ЯЁA-Z][а-яёa-z]+$/.test(words[i + 1])) {
            author += ' ' + words[i + 1];
          }
          break;
        }
      }
    }
  }
  
  // Дополнительная проверка: если запрос выглядит как тематический (с ключевыми словами), 
  // но был распознан автор с заглавной буквы, проверим не ложное ли это срабатывание
  if (author && textLower.includes('истор')) {
    const authorLower = author.toLowerCase();
    // Если автор похож на географическое название, а запрос похож на тематику исторического характера
    if (authorLower.includes('казахстан') || 
        authorLower.includes('росси') || 
        authorLower.includes('европ') || 
        authorLower.includes('ази')) {
      // Это скорее всего тематический запрос типа "История Казахстана"
      query = text.trim();
      author = '';
    }
  }
  
  return { author, title, query };
}

/**
 * Анализирует запрос пользователя и возвращает тип запроса и параметры
 * @param {string} message - Сообщение пользователя
 * @returns {Object} - Объект с типом запроса и параметрами
 */
async function analyzeRequest(message) {
  console.log(`[AI Service] Анализирую запрос: "${message}"`);
  
  const lowerMessage = message.toLowerCase();
  
  // Проверяем запрос на информацию о библиотеке
  if (/(?:где|как|когда|какие|какой|что|библиотек|информаци|время работы|график|режим|адрес|телефон|контакт|часы|залы|правила|запис|регистрац|wifi|туалет|компьютер|принтер)/i.test(message)) {
    console.log('[AI Service] Определен запрос о библиотеке');
    return {
      type: 'library_info',
      params: { query: message }
    };
  }
  
  // Извлекаем параметры поиска
  const searchParams = extractSearchParams(message);
  console.log('[AI Service] Извлеченные параметры:', searchParams);
  
  // Определяем, достаточно ли информации для поиска без дополнительных уточнений
  const hasEnoughInfo = hasCompleteSearchParams(searchParams, message);
  
  // Если есть автор или название или тема, то это запрос на поиск книги
  if (searchParams.author || searchParams.title || searchParams.query) {
    return {
      type: 'book_search',
      params: searchParams,
      needsConfirmation: !hasEnoughInfo // Не требуем подтверждения, если информации достаточно
    };
  }
  
  // Если ничего конкретного не определили, но есть ключевые слова книги
  if (/(?:книг|учебник|пособие|роман|рассказ|стих)/i.test(lowerMessage)) {
    return {
      type: 'book_search',
      params: {},
      needsMoreInfo: true
    };
  }
  
  // По умолчанию - не определено
  return {
    type: 'unknown',
    params: {}
  };
}

/**
 * Проверяет, достаточно ли информации для поиска без дополнительных уточнений
 * @param {Object} params - Параметры поиска
 * @param {string} originalMessage - Оригинальное сообщение пользователя
 * @returns {boolean} - true, если информации достаточно
 */
function hasCompleteSearchParams(params, originalMessage) {
  // Если указан автор и это явный запрос на поиск (ищу/найди/etc)
  if (params.author && /(?:найди|ищ[иу]|поиск|книг[иу])/i.test(originalMessage)) {
    console.log('[AI Service] Найден явный запрос с автором, информации достаточно');
    return true;
  }
  
  // Если указаны и автор, и название
  if (params.author && params.title) {
    console.log('[AI Service] Найдены автор и название, информации достаточно');
    return true;
  }
  
  // Если в запросе есть только имя автора, и оно явно выглядит как полное имя
  if (params.author && !params.title && !params.query && 
      params.author.split(/\s+/).length >= 2 && 
      /^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+$/i.test(params.author)) {
    console.log('[AI Service] Найдено полное имя автора, информации достаточно');
    return true;
  }
  
  // Если запрос краткий и содержит только имя автора
  if (params.author && originalMessage.trim().split(/\s+/).length <= 4) {
    console.log('[AI Service] Найден краткий запрос с автором, информации достаточно');
    return true;
  }
  
  // Если указана конкретная тема в формате явного поиска
  if (params.query && /(?:найди|ищ[иу]|поиск|книг[иу])/i.test(originalMessage)) {
    console.log('[AI Service] Найден явный запрос с темой, информации достаточно');
    return true;
  }
  
  // Если запрос содержит ключевые фразы, указывающие на полноту информации
  const directSearchPatterns = [
    /нужна книга/i,
    /хочу найти/i,
    /интересуют книги/i,
    /по запросу/i,
    /книги по теме/i,
    /стихи/i,
    /избранные/i,
    /произведени/i
  ];
  
  if (directSearchPatterns.some(pattern => pattern.test(originalMessage)) && 
      (params.author || params.title || params.query)) {
    console.log('[AI Service] Найден прямой запрос с параметрами, информации достаточно');
    return true;
  }
  
  // По умолчанию требуем подтверждения
  return false;
}

module.exports = {
  processMessage,
  extractSearchParams,
  analyzeRequest,
}; 