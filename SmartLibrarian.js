require('dotenv').config();
const OpenAI = require('openai');
const Chats = require('./models/Chats');
const BookController = require('./controller/BookController');

class SmartLibrarian {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.systemPrompt = {
            role: "system",
            content: `Вы - умный библиотечный ассистент Национальной академической библиотеки Республики Казахстан. Ваша задача - помогать искать книги и предоставлять информацию о библиотеке.
        
        ВАЖНО О ПОИСКЕ КНИГ:
        1. Используйте только ключевые слова предметной области для поиска
        2. Не добавляйте в поисковый запрос слова "диссертация", "реферат", "книга" и т.п.
        3. Не используйте служебные слова в поисковом запросе
        4. Ищите только по основной теме, даже если пользователь упоминает вид работы
        
        Примеры запросов о КНИГАХ:
        - "Нужны книги по математике для диссертации" → searchBooks({query: "математика"})
        - "Пишу реферат о квантовой физике" → searchBooks({query: "квантовая физика"})
        - "Мне нужно найти литературу по истории Казахстана" → searchBooks({query: "история Казахстан"})
        
        ИНФОРМАЦИЯ О БИБЛИОТЕКЕ:
        - Название: Национальная академическая библиотека Республики Казахстан
        - Адрес: г. Астана, ул. Достык, 11
        - Телефон: +7 (7172) 70-65-00
        - Электронная почта: nabrk@nabrk.kz
        - Веб-сайт: www.nabrk.kz
        
        Часы работы:
        - Понедельник-пятница: с 09:00 до 20:00
        - Суббота: с 09:00 до 18:00
        - Воскресенье: выходной
        - Последний день месяца: санитарный день
        
        Основные услуги:
        - Доступ к книжному фонду и электронным ресурсам
        - Регистрация и выдача читательских билетов
        - Консультации по поиску информации
        - Предоставление рабочих мест и компьютеров с доступом в интернет
        - Проведение культурных и образовательных мероприятий
        
        Если запрос пользователя понятен и конкретен - СРАЗУ выполняйте поиск, НЕ задавайте уточняющих вопросов.
        
        Задавайте уточняющие вопросы ТОЛЬКО когда запрос действительно неясен. Например:
        - "Хочу хорошую книгу" (слишком общий запрос)
        - "Что-нибудь интересное" (неконкретно)
        - "Абай" (неясно - автор или тема)
        
        ПОМНИТЕ: если пользователь отвечает "Да" на ваше уточнение, СРАЗУ используйте предложенные вами темы для поиска.
        
        ВАЖНО О ЗАПРОСАХ ПОМОЩИ:
        Когда пользователь просит помочь написать текст, эссе, сочинение, реферат и т.п., НЕ выполняйте поиск книг, 
        а предложите свою помощь в составлении плана, структуры или консультации по теме. Поясните, что вы можете:
        1. Помочь составить план текста
        2. Предложить структуру работы
        3. Дать рекомендации по содержанию
        4. Объяснить, как лучше раскрыть тему
        5. Рекомендовать источники информации`
        };
        
        // Информация о библиотеке
        this.libraryInfo = {
            general: {
                name: "Национальная академическая библиотека Республики Казахстан",
                description: "Национальная академическая библиотека Республики Казахстан (НАБ РК) основана в 2004 году и является одной из крупнейших библиотек страны. Библиотека располагает обширным фондом научной, образовательной и художественной литературы на различных языках.",
                mission: "Миссия библиотеки - содействие развитию интеллектуального потенциала страны через обеспечение доступа к знаниям и информации."
            },
            
            contacts: {
                address: "г. Астана, ул. Достык, 11",
                phone: "+7 (7172) 70-65-00",
                email: "nabrk@nabrk.kz",
                website: "www.nabrk.kz",
                socialMedia: {
                    facebook: "facebook.com/nabrkz",
                    instagram: "@nabrkastana",
                    telegram: "t.me/nabrkastana"
                }
            },
            
            hours: {
                weekdays: "с 09:00 до 20:00 (Понедельник-Пятница)",
                saturday: "с 09:00 до 18:00",
                sunday: "Выходной день",
                sanitaryDay: "Последний день каждого месяца - санитарный день"
            },
            
            staff: [
                {
                    name: "Муналбаева У.Д.",
                    position: "Генеральный директор",
                    contact: "director@nabrk.kz"
                },
                {
                    name: "Искалиева Н.А.",
                    position: "Заместитель генерального директора",
                    contact: "n.iskalieva@nabrk.kz"
                },
                {
                    name: "Бердигалиева Р.А.",
                    position: "Главный библиотекарь",
                    contact: "r.berdigalieva@nabrk.kz"
                }
            ],
            
            services: {
                general: [
                    "Доступ к книжному фонду",
                    "Электронный каталог",
                    "Виртуальная справочная служба",
                    "Межбиблиотечный абонемент",
                    "Wi-Fi на территории библиотеки"
                ],
                
                special: [
                    "Организация культурных мероприятий",
                    "Выставки и презентации",
                    "Образовательные программы и лекции",
                    "Электронные ресурсы и базы данных",
                    "Виртуальные туры по библиотеке"
                ]
            },
            
            rules: {
                membership: "Для оформления читательского билета необходимо предъявить удостоверение личности, фотографию 3x4 и оплатить стоимость билета (2000 тг).",
                borrowing: "Срок пользования книгами - 14 дней с правом продления, если на издание нет спроса со стороны других читателей.",
                conduct: "В библиотеке запрещается шуметь, использовать мобильные телефоны для разговоров, принимать пищу в читальных залах.",
                fees: "Штраф за несвоевременный возврат книги составляет 100 тг за каждый день просрочки."
            },
            
            collections: {
                size: "Фонд библиотеки насчитывает более 1,5 миллиона экземпляров",
                specialCollections: [
                    "Коллекция редких книг",
                    "Казахстанская коллекция",
                    "Научная периодика",
                    "Электронная библиотека"
                ]
            }
        };
    }

    getLibraryInfo(params) {
        try {
            const topic = params?.topic || "general";
            const searchTerm = params?.searchTerm || "";
            
            // Поиск информации о сотрудниках
            if (topic === "staff") {
                if (searchTerm) {
                    // Поиск по имени или должности
                    const foundStaff = this.libraryInfo.staff.filter(person => 
                        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        person.position.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    
                    if (foundStaff.length > 0) {
                        return {
                            found: true,
                            data: foundStaff,
                            message: `Найдена информация о ${foundStaff.length} сотрудниках.`
                        };
                    } else {
                        return {
                            found: false,
                            message: `Сотрудник с именем или должностью "${searchTerm}" не найден.`
                        };
                    }
                } else {
                    // Возвращаем всех сотрудников
                    return {
                        found: true,
                        data: this.libraryInfo.staff,
                        message: `Информация о сотрудниках библиотеки.`
                    };
                }
            }
            
            // Поиск общей информации о библиотеке
            if (topic === "general") {
                return {
                    found: true,
                    data: this.libraryInfo.general,
                    message: "Общая информация о библиотеке."
                };
            }
            
            // Информация о часах работы
            if (topic === "hours") {
                return {
                    found: true,
                    data: this.libraryInfo.hours,
                    message: "Часы работы библиотеки."
                };
            }
            
            // Контактная информация
            if (topic === "contacts") {
                return {
                    found: true,
                    data: this.libraryInfo.contacts,
                    message: "Контактная информация библиотеки."
                };
            }
            
            // Правила библиотеки
            if (topic === "rules") {
                return {
                    found: true,
                    data: this.libraryInfo.rules,
                    message: "Правила пользования библиотекой."
                };
            }
            
            // Услуги библиотеки
            if (topic === "services") {
                return {
                    found: true,
                    data: this.libraryInfo.services,
                    message: "Услуги, предоставляемые библиотекой."
                };
            }
            
            // Коллекции библиотеки
            if (topic === "collections") {
                return {
                    found: true,
                    data: this.libraryInfo.collections,
                    message: "Информация о коллекциях библиотеки."
                };
            }
            
            // Если тема не найдена
            return {
                found: false,
                message: `Информация по теме "${topic}" не найдена.`
            };
            
        } catch (error) {
            console.error("Ошибка при получении информации о библиотеке:", error);
            return {
                found: false,
                error: true,
                message: "Произошла ошибка при получении информации о библиотеке."
            };
        }
    }

    async analyzeRequest(message) {
        try {
            // Простые приветствия
            const simpleGreetings = [
                "привет", "здравствуйте", "добрый день", "добрый вечер", "доброе утро", 
                "здрасьте", "приветствую", "сәлем", "салем", "қайырлы таң", "қайырлы күн", 
                "қайырлы кеш", "как дела", "как ты", "как вы"
            ];
            
            // Маркеры запросов о помощи в написании текста
            const helpWithWritingMarkers = [
                "помоги написать", "помоги с написанием", "как написать", 
                "напиши для меня", "напиши мне", "помоги составить",
                "сочини для меня", "составь для меня", "сделай за меня", 
                "как составить", "как сделать доклад", "как подготовить эссе"
            ];
            
            // Маркеры запросов о библиотеке
            const libraryInfoMarkers = [
                "библиотека", "режим работы", "часы работы", "график работы",
                "адрес библиотеки", "где находится", "как добраться", "контакты",
                "телефон библиотеки", "почта библиотеки", "сайт библиотеки",
                "правила библиотеки", "как записаться", "читательский билет",
                "услуги библиотеки", "мероприятия", "выставки", "сотрудники",
                "руководство библиотеки", "директор библиотеки", "о библиотеке"
            ];
            
            const normalizedMessage = message.toLowerCase().trim();
            
            // Если это просто приветствие - обрабатываем сразу как приветствие
            if (simpleGreetings.includes(normalizedMessage) || 
                simpleGreetings.some(greeting => normalizedMessage.startsWith(greeting + " ")) ||
                normalizedMessage.length < 15) {
                    
                return {
                    requestType: "greeting",
                    confidence: 100,
                    topic: "приветствие",
                    suggestedFunction: null
                };
            }
            
            // Проверяем, является ли это запросом о библиотеке
            if (libraryInfoMarkers.some(marker => normalizedMessage.includes(marker))) {
                let topic = "general";
                
                if (normalizedMessage.includes("часы") || normalizedMessage.includes("режим") || normalizedMessage.includes("график") || 
                    normalizedMessage.includes("когда") || normalizedMessage.includes("работает")) {
                    topic = "hours";
                } else if (normalizedMessage.includes("адрес") || normalizedMessage.includes("контакт") || 
                           normalizedMessage.includes("телефон") || normalizedMessage.includes("почта") || 
                           normalizedMessage.includes("сайт") || normalizedMessage.includes("где наход")) {
                    topic = "contacts";
                } else if (normalizedMessage.includes("правил") || normalizedMessage.includes("запис") || 
                           normalizedMessage.includes("билет") || normalizedMessage.includes("как польз")) {
                    topic = "rules";
                } else if (normalizedMessage.includes("услуг") || normalizedMessage.includes("сервис") || 
                           normalizedMessage.includes("что предлаг") || normalizedMessage.includes("мероприят") || 
                           normalizedMessage.includes("выставк")) {
                    topic = "services";
                } else if (normalizedMessage.includes("сотрудник") || normalizedMessage.includes("директор") || 
                           normalizedMessage.includes("руководств") || normalizedMessage.includes("персонал") || 
                           normalizedMessage.includes("работник")) {
                    topic = "staff";
                } else if (normalizedMessage.includes("коллекц") || normalizedMessage.includes("фонд") || 
                           normalizedMessage.includes("книг") || normalizedMessage.includes("экземпляр")) {
                    topic = "collections";
                }
                
                return {
                    requestType: "library_info",
                    confidence: 90,
                    topic: topic,
                    suggestedFunction: {
                        name: "getLibraryInfo",
                        params: {
                            topic: topic,
                            searchTerm: normalizedMessage
                        }
                    }
                };
            }
            
            // Проверяем, является ли это запросом о помощи в написании текста
            if (helpWithWritingMarkers.some(marker => normalizedMessage.includes(marker))) {
                return {
                    requestType: "writing_help",
                    confidence: 90,
                    topic: "помощь в написании",
                    suggestedFunction: null
                };
            }
            
            // Если не удалось определить тип запроса с помощью простых правил,
            // используем GPT для классификации запроса
            if (message.length > 10) {
                try {
                    const classification = await this.classifyRequestWithGPT(message);
                    return classification;
                } catch (classificationError) {
                    console.error('Ошибка классификации запроса с помощью GPT:', classificationError);
                    // В случае ошибки классификации продолжаем с базовым анализом
                }
            }
            
            // По умолчанию интерпретируем запрос как поиск книг
            return {
                requestType: "books",
                confidence: 80,
                topic: "поиск по запросу",
                suggestedFunction: {
                    name: "searchBooks",
                    params: this.extractBookParams(message)
                }
            };
        } catch (error) {
            console.error('Ошибка анализа запроса:', error);
            // Возвращаем поиск по книгам при ошибке
            return {
                requestType: "books",
                confidence: 50,
                topic: "поиск по запросу",
                suggestedFunction: {
                    name: "searchBooks",
                    params: {
                        author: null,
                        title: null,
                        query: message
                    }
                }
            };
        }
    }
    
    // Классификация запроса с помощью GPT
    async classifyRequestWithGPT(message) {
        try {
            console.log('🔍 Классифицируем запрос с помощью GPT:', message);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `Ты - анализатор запросов пользователя для библиотечного ассистента. 
Твоя задача - определить тип запроса пользователя.

Возможные типы запросов:
1. greeting - приветствие, не требующее поиска информации
2. books - запрос о поиске книг (по автору, названию или теме)
3. writing_help - запрос о помощи в написании текста, эссе, реферата и т.п.
4. library_info - запрос об информации о библиотеке (режим работы, адрес, услуги и т.д.)

Верни результат в JSON формате:
{
    "requestType": "books" | "greeting" | "writing_help" | "library_info",
    "confidence": число от 0 до 100,
    "topic": "краткое описание темы запроса",
    "suggestedFunction": null или { "name": "searchBooks", "params": { "author": "имя автора или null", "title": "название книги или null", "query": "поисковый запрос или null" } } или { "name": "getLibraryInfo", "params": { "topic": "general" | "hours" | "contacts" | "rules" | "services" | "staff" | "collections", "searchTerm": "текст запроса или null" } }
}

Примеры:
Запрос: "Привет, как дела?"
Ответ: { "requestType": "greeting", "confidence": 100, "topic": "приветствие", "suggestedFunction": null }

Запрос: "Мне нужны книги по квантовой физике"
Ответ: { "requestType": "books", "confidence": 95, "topic": "поиск книг по физике", "suggestedFunction": { "name": "searchBooks", "params": { "author": null, "title": null, "query": "квантовая физика" } } }

Запрос: "Когда работает библиотека?"
Ответ: { "requestType": "library_info", "confidence": 95, "topic": "режим работы", "suggestedFunction": { "name": "getLibraryInfo", "params": { "topic": "hours", "searchTerm": "когда работает библиотека" } } }

Запрос: "Помоги мне написать эссе о влиянии технологий"
Ответ: { "requestType": "writing_help", "confidence": 90, "topic": "помощь с эссе", "suggestedFunction": null }`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            });
            
            // Извлекаем и парсим JSON из ответа
            try {
                const result = JSON.parse(completion.choices[0].message.content);
                console.log('📊 Результат классификации:', result);
                return result;
            } catch (parseError) {
                console.error('Ошибка парсинга JSON из ответа GPT:', parseError);
                throw new Error('Не удалось распознать формат ответа от GPT');
            }
        } catch (error) {
            console.error('Ошибка при классификации запроса:', error);
            throw error;
        }
    }
    
    // Вспомогательные методы для анализа запроса
    extractBookParams(message) {
        const params = {
            author: null,
            title: null,
            query: null
        };
        
        // Пытаемся найти автора
        const authorMatch = message.match(/(?:автор|писат[а-я]+)[^а-я]+([\p{L}\s\d\-]+)/ui);
        if (authorMatch && authorMatch[1]) {
            params.author = authorMatch[1].trim();
        }
        
        // Пытаемся найти название книги
        const titleMatch = message.match(/(?:название|книг[а-я]+)[^а-я]+"([^"]+)"/ui);
        if (titleMatch && titleMatch[1]) {
            params.title = titleMatch[1].trim();
        }
        
        // Если не нашли автора и название, используем общий запрос
        if (!params.author && !params.title) {
            // Удаляем слова, которые не нужны для поиска
            let cleanedMessage = message.replace(/найти|книги|литература|по|автор|название|о|дай|пожалуйста|мне|нужны|нужна|для/gi, ' ');
            cleanedMessage = cleanedMessage.replace(/\s+/g, ' ').trim();
            
            if (cleanedMessage && cleanedMessage.length > 2) {
                params.query = cleanedMessage;
            }
        }
        
        return params;
    }

    async chat(message, token) {
        try {
            console.log('\n======= НОВЫЙ ЗАПРОС ЧАТА =======');
            console.log('📝 Сообщение пользователя:', message);
            console.log('🔑 Токен:', token);

            // Получаем историю чата
            const previousMessages = await Chats.findAll({
                where: { token: token || 0 },
                order: [['createdAt', 'DESC']],
                limit: 10
            });

            console.log('📚 История чата (последние 10 сообщений):');
            const formattedMessages = previousMessages.reverse();
            formattedMessages.forEach((msg, index) => {
                console.log(`   ${index + 1}. ${msg.role}: ${msg.text}`);
            });

            // Анализируем запрос пользователя
            console.log('🔍 Анализируем запрос пользователя...');
            const requestAnalysis = await this.analyzeRequest(message);
            console.log('📊 Результат анализа:', requestAnalysis);
            
            // Формируем контекст для GPT
            const context = formattedMessages.map(msg => ({
                role: msg.role,
                content: msg.text
            }));

            console.log('\n🧠 Отправляем запрос к GPT...');

            // Если это приветствие, напрямую обрабатываем его
            if (requestAnalysis.requestType === "greeting") {
                console.log(`👋 Обнаружено приветствие, отвечаем напрямую`);
                
                // Системный промпт для приветствия
                let systemPromptContent = `Ты - библиотечный ассистент.
                    
Ответь коротким, живым приветствием. Упомяни, что можешь помочь с поиском книг, но делай это ЕСТЕСТВЕННО, как живой человек.
Никаких шаблонных фраз и формальных конструкций.

Говори на том же языке, что и пользователь.`;
                
                const completionResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPromptContent },
                        ...context,
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                });
                
                const aiResponse = completionResponse.choices[0].message;
                
                // Сохраняем сообщения
                await Chats.create({
                    role: 'user',
                    text: message,
                    token: token || 0
                });

                await Chats.create({
                    role: 'assistant',
                    text: aiResponse.content,
                    token: token || 0
                });
                
                console.log('\n✅ Запрос обработан успешно');
                return {
                    message: aiResponse.content,
                    searchResults: null
                };
            }
            
            // Если это запрос о помощи в написании текста
            if (requestAnalysis.requestType === "writing_help") {
                console.log(`📝 Обнаружен запрос о помощи в написании, отвечаем напрямую`);
                
                // Системный промпт для помощи в написании
                let systemPromptContent = `Ты - библиотечный ассистент.

Пользователь просит помощи в написании текста. Твоя задача - направить разговор в сторону поиска полезных книг или источников.

Правила ответа:
1. Не пиши длинные инструкции по созданию текстов
2. Не составляй планы или структуры работ
3. Предложи найти книги и материалы по теме запроса
4. Спроси, какие именно источники нужны пользователю 
5. Будь краток и естественен

Пример хорошего ответа:
"Я могу помочь найти полезные книги и материалы по этой теме. Какие именно источники вам нужны для работы?"

Пример плохого ответа:
"Для написания эссе вам нужно сделать следующее: 1. Составить план... 2. Написать введение... 3. Раскрыть основную часть..."

Говори просто, как человек. Определи тему из запроса пользователя и сфокусируйся на поиске материалов по ней. Предложи помощь в подборе книг.`;
                
                const completionResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPromptContent },
                        ...context,
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                });
                
                const aiResponse = completionResponse.choices[0].message;
                
                // Сохраняем сообщения
                await Chats.create({
                    role: 'user',
                    text: message,
                    token: token || 0
                });

                await Chats.create({
                    role: 'assistant',
                    text: aiResponse.content,
                    token: token || 0
                });
                
                console.log('\n✅ Запрос обработан успешно');
                return {
                    message: aiResponse.content,
                    searchResults: null
                };
            }

            // Если это запрос о библиотеке
            if (requestAnalysis.requestType === "library_info") {
                console.log(`📚 Обнаружен запрос о библиотеке, предоставляем информацию`);
                
                // Получаем информацию о библиотеке
                const libraryInfoParams = requestAnalysis.suggestedFunction.params;
                const libraryInfoResult = this.getLibraryInfo(libraryInfoParams);
                
                console.log('📊 Результат запроса информации о библиотеке:', libraryInfoResult);
                
                // Формируем системный промпт для ответа
                let systemPromptContent = `Ты - ассистент Национальной академической библиотеки Республики Казахстан.
                    
Пользователь спрашивает о библиотеке. Ответь на вопрос дружелюбно и информативно, используя предоставленную информацию.
Если информация неполная, скажи, что у тебя ограниченные данные и предложи обратиться на сайт библиотеки или по телефону для получения более подробной информации.

Говори на том же языке, что и пользователь (русский или казахский).`;
                
                const completionResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPromptContent },
                        ...context,
                        { role: 'user', content: message },
                        { 
                            role: 'function', 
                            name: 'getLibraryInfo',
                            content: JSON.stringify(libraryInfoResult)
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });
                
                const aiResponse = completionResponse.choices[0].message;
                
                // Сохраняем сообщения
                await Chats.create({
                    role: 'user',
                    text: message,
                    token: token || 0
                });

                await Chats.create({
                    role: 'assistant',
                    text: aiResponse.content,
                    token: token || 0
                });
                
                console.log('\n✅ Запрос обработан успешно');
                return {
                    message: aiResponse.content,
                    searchResults: null
                };
            }

            // Отправляем запрос к GPT для поиска книг
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    this.systemPrompt,
                    ...context,
                    { role: 'user', content: message }
                ],
                functions: [
                    {
                        name: "searchBooks",
                        description: "Search for books by author, title or general query",
                        parameters: {
                            type: "object",
                            properties: {
                                author: { type: "string", description: "Author name" },
                                title: { type: "string", description: "Book title" },
                                query: { type: "string", description: "General search query" }
                            }
                        }
                    }
                ],
                // Подсказываем модели, какую функцию использовать на основе анализа запроса
                function_call: requestAnalysis && requestAnalysis.suggestedFunction ? 
                               {name: requestAnalysis.suggestedFunction.name} : "auto"
            });

            const aiResponse = completion.choices[0].message;
            console.log('\n🤖 Ответ GPT:');
            console.log('   Контент:', aiResponse.content || '[Нет контента, только вызов функции]');
            
            // Проверяем, решил ли AI искать книги
            let searchResults = null;
            
            if (aiResponse.function_call && aiResponse.function_call.name === 'searchBooks') {
                const searchParams = JSON.parse(aiResponse.function_call.arguments);
                console.log('📊 Исходные параметры поиска:', searchParams);
                
                // Преобразуем запрос, добавляя правильный регистр
                if (searchParams.query) {
                    // Сохраняем оригинальный запрос
                    const originalQuery = searchParams.query;
                    
                    // Преобразуем в вариант с заглавными первыми буквами
                    const words = searchParams.query.split(' ');
                    const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    );
                    const capitalizedQuery = capitalizedWords.join(' ');
                    
                    // Используем вариант с заглавными буквами
                    searchParams.query = capitalizedQuery;
                    
                    console.log('📊 Запрос пользователя:', originalQuery);
                    console.log('📊 Преобразованный запрос:', capitalizedQuery);
                }
                
                // Также преобразуем автора, если он указан
                if (searchParams.author) {
                    const words = searchParams.author.split(' ');
                    const capitalizedWords = words.map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    );
                    searchParams.author = capitalizedWords.join(' ');
                    
                    console.log('📊 Преобразованный автор:', searchParams.author);
                }
                
                console.log('\n📚 Передаем запрос в BookController...');
                // Используем BookController для поиска
                const mockReq = { body: searchParams };
                const mockRes = {
                    json: (data) => {
                        // Сохраняем полную структуру ответа
                        searchResults = {
                            books: data.books || [],
                            sources: data.sources || { description: [], udc: [] }
                        };
                        
                        const booksCount = searchResults.books?.length || 0;
                        console.log(`🔎 BookController вернул ${booksCount} книг`);
                        
                        if (booksCount > 0) {
                            console.log('   Первые 3 книги:');
                            searchResults.books.slice(0, 3).forEach((book, i) => {
                                console.log(`     ${i+1}. "${book.TITLE}" - ${book.AUTHOR}`);
                            });
                        } else {
                            console.log('   ❌ Книги не найдены');
                        }
                    }
                };

                console.time('⏱️ Время поиска');
                await BookController.searchBooks(mockReq, mockRes);
                console.timeEnd('⏱️ Время поиска');
                
                // Если не нашли книги с заглавными буквами, попробуем с оригинальным запросом
                if (searchParams.query && (!searchResults.books || searchResults.books.length === 0)) {
                    console.log('📚 Книги не найдены, пробуем альтернативный запрос...');
                    
                    // Создаем новый запрос с оригинальным текстом (в нижнем регистре)
                    const alternativeReq = { 
                        body: { 
                            ...searchParams,
                            query: searchParams.query.toLowerCase()
                        } 
                    };
                    
                    console.log('📊 Альтернативный запрос:', alternativeReq.body.query);
                    
                    // Выполняем поиск еще раз
                    console.time('⏱️ Время альтернативного поиска');
                    await BookController.searchBooks(alternativeReq, mockRes);
                    console.timeEnd('⏱️ Время альтернативного поиска');
                }
                
                // Отправляем результаты поиска обратно в GPT
                console.log('\n🧠 Отправляем результаты поиска обратно в GPT...');
                
                // Выбираем книги для отправки
                const booksToSend = searchResults.sources && searchResults.sources.description && 
                                  searchResults.sources.description.length > 0 ? 
                                  searchResults.sources.description : searchResults.books;
                
                console.log(`📚 Отправляем ${booksToSend.length} книг в GPT`);
                
                const finalResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: `Ты - библиотечный ассистент. Твоя задача - сообщить результаты поиска книг понятно и информативно.

Вот книги, найденные по запросу пользователя:

ВАЖНО:
• Всегда указывай название, автора и BR_ID для каждой книги
• Если найдено более 5 книг, покажи только 5 наиболее релевантных
• Если книги не найдены, сообщи об этом и предложи уточнить запрос или попробовать другие ключевые слова
• Отвечай на том же языке, что и запрос (русский или казахский)
• Предложи пользователю уточнить запрос, если результаты не соответствуют его ожиданиям

Формат представления книг:
1. "НАЗВАНИЕ" - АВТОР (БР ID: XXXX)
2. "НАЗВАНИЕ" - АВТОР (БР ID: XXXX)
...

В конце обязательно спроси, интересуют ли пользователя эти книги или помочь с другими запросами.`
                        },
                        ...context,
                        { role: 'user', content: message },
                        aiResponse,
                        {
                            role: 'function',
                            name: 'searchBooks',
                            content: JSON.stringify(booksToSend || [])
                        }
                    ]
                });

                aiResponse.content = finalResponse.choices[0].message.content;
                
                console.log('🤖 Финальный ответ:', aiResponse.content);
            }

            // Сохраняем сообщения
            await Chats.create({
                role: 'user',
                text: message,
                token: token || 0
            });

            await Chats.create({
                role: 'assistant',
                text: aiResponse.content,
                token: token || 0
            });

            console.log('\n✅ Запрос обработан успешно');
            return {
                message: aiResponse.content,
                searchResults: searchResults
            };

        } catch (error) {
            console.error('❌ Ошибка в чате:', error);
            throw error;
        }
    }
}

module.exports = new SmartLibrarian(); 