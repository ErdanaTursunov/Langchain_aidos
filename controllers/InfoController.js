/**
 * Контроллер для получения информации о библиотеке
 * @module InfoController
 */

// Информация о библиотеке
const libraryInfo = {
  name: 'Национальная академическая библиотека Республики Казахстан',
  address: 'г. Астана, ул. Достык, 11',
  workingHours: 'Пн-Пт: 9:00 - 20:00, Сб: 9:00 - 18:00, Вс: выходной',
  phone: '+7 (7172) 24-33-22',
  website: 'www.nabrk.kz',
  sections: [
    { name: 'Читальный зал художественной литературы', floor: 1, room: '101' },
    { name: 'Зал научной литературы', floor: 2, room: '201' },
    { name: 'Зал периодических изданий', floor: 1, room: '105' },
    { name: 'Детский зал', floor: 1, room: '110' },
    { name: 'Компьютерный зал с доступом в интернет', floor: 3, room: '301' },
    { name: 'Медиатека', floor: 3, room: '310' },
    { name: 'Зал редких книг и рукописей', floor: 2, room: '215' }
  ],
  services: [
    { name: 'Выдача книг на дом', description: 'Доступно для зарегистрированных пользователей с читательским билетом' },
    { name: 'Доступ к электронному каталогу', description: 'Доступен на всех компьютерах библиотеки и через сайт' },
    { name: 'Распечатка и сканирование', description: 'Платная услуга, осуществляется в помещении 103 на первом этаже' },
    { name: 'Wi-Fi', description: 'Бесплатный доступ во всей библиотеке для зарегистрированных пользователей' }
  ],
  rules: [
    'Для получения читательского билета необходимо предъявить удостоверение личности',
    'В читальных залах запрещается громко разговаривать, пользоваться мобильными телефонами',
    'Запрещается выносить книги из библиотеки без оформления',
    'Срок возврата книг - 14 дней, можно продлить онлайн или по телефону'
  ],
  registration: 'Для регистрации необходимо обратиться на стойку регистрации на первом этаже с удостоверением личности. Стоимость читательского билета - 500 тенге, студентам и пенсионерам - 250 тенге.',
  catalog: 'Электронный каталог доступен на сайте библиотеки и на специальных компьютерах в зоне каталога на первом этаже. Для поиска можно использовать автора, название книги или ключевые слова.',
  toilets: 'Туалеты расположены на каждом этаже возле лестницы.',
  wifi: 'Wi-Fi доступен во всех зонах библиотеки. Имя сети: NAB_FREE, пароль можно получить на стойке информации при предъявлении читательского билета.',
  computers: 'Компьютеры с доступом в интернет расположены в компьютерном зале на 3-м этаже, комната 301. Время работы ограничено 2 часами в день для одного пользователя. Требуется читательский билет.'
};

/**
 * Функция для получения информации о библиотеке по запросу
 * @param {string} question - Вопрос о библиотеке
 * @returns {Object} - Ответ на вопрос
 */
function getLibraryInfo(question) {
  try {
    console.log('Запрос информации о библиотеке:', question);
    
    if (!question) {
      return {
        success: false,
        error: 'Не указан вопрос',
        info: ''
      };
    }
    
    const questionLower = question.toLowerCase();
    
    // Обработка запросов по категориям
    let infoResponse = '';
    
    // Запрос об адресе или расположении
    if (questionLower.includes('адрес') || 
        questionLower.includes('где наход') || 
        questionLower.includes('местополож') || 
        questionLower.includes('как добрат')) {
      infoResponse = `Библиотека расположена по адресу: ${libraryInfo.address}.`;
    }
    
    // Запрос о режиме работы
    else if (questionLower.includes('режим') || 
             questionLower.includes('график') || 
             questionLower.includes('часы работы') || 
             questionLower.includes('когда работает') || 
             questionLower.includes('до скольки') || 
             questionLower.includes('выходн')) {
      infoResponse = `Режим работы библиотеки: ${libraryInfo.workingHours}.`;
    }
    
    // Запрос о разделах библиотеки
    else if (questionLower.includes('раздел') || 
             questionLower.includes('зал') || 
             questionLower.includes('отдел')) {
      infoResponse = 'В библиотеке есть следующие разделы и залы:\n';
      libraryInfo.sections.forEach(section => {
        infoResponse += `- ${section.name} (${section.floor} этаж, комната ${section.room})\n`;
      });
    }
    
    // Запрос о правилах
    else if (questionLower.includes('правил') || 
             questionLower.includes('запрещ') || 
             questionLower.includes('разреш') || 
             questionLower.includes('можно ли')) {
      infoResponse = 'Правила пользования библиотекой:\n';
      libraryInfo.rules.forEach((rule, index) => {
        infoResponse += `${index + 1}. ${rule}\n`;
      });
    }
    
    // Запрос о регистрации и читательском билете
    else if (questionLower.includes('регистрац') || 
             questionLower.includes('записат') || 
             questionLower.includes('читател') || 
             questionLower.includes('билет') || 
             questionLower.includes('как получить доступ')) {
      infoResponse = libraryInfo.registration;
    }
    
    // Запрос о каталоге
    else if (questionLower.includes('каталог') || 
             questionLower.includes('найти книг') || 
             questionLower.includes('поиск книг')) {
      infoResponse = libraryInfo.catalog;
    }
    
    // Запрос о туалетах
    else if (questionLower.includes('туалет') || 
             questionLower.includes('уборн') || 
             questionLower.includes('wc')) {
      infoResponse = libraryInfo.toilets;
    }
    
    // Запрос о Wi-Fi
    else if (questionLower.includes('wi-fi') || 
             questionLower.includes('wifi') || 
             questionLower.includes('вай-фай') || 
             questionLower.includes('интернет')) {
      infoResponse = libraryInfo.wifi;
    }
    
    // Запрос о компьютерах
    else if (questionLower.includes('компьютер') || 
             questionLower.includes('пк') || 
             questionLower.includes('ноутбук')) {
      infoResponse = libraryInfo.computers;
    }
    
    // Запрос об услугах
    else if (questionLower.includes('услуг') || 
             questionLower.includes('сервис') || 
             questionLower.includes('предлаг') || 
             questionLower.includes('предоставля')) {
      infoResponse = 'Библиотека предоставляет следующие услуги:\n';
      libraryInfo.services.forEach((service, index) => {
        infoResponse += `${index + 1}. ${service.name} - ${service.description}\n`;
      });
    }
    
    // Запрос об общей информации
    else if (questionLower.includes('общая информац') || 
             questionLower.includes('о библиотек') || 
             questionLower.includes('расскажи о библиотек')) {
      infoResponse = `${libraryInfo.name} расположена по адресу: ${libraryInfo.address}.\n\n`+
                    `Режим работы: ${libraryInfo.workingHours}.\n\n`+
                    `Телефон: ${libraryInfo.phone}\n`+
                    `Сайт: ${libraryInfo.website}\n\n`+
                    `В библиотеке есть различные залы и отделы, компьютеры с доступом в интернет, Wi-Fi и другие услуги для комфортной работы с информацией.`;
    }
    
    // Если не смогли определить тип запроса
    else {
      infoResponse = `К сожалению, у меня нет точной информации по этому вопросу. Вы можете уточнить информацию по телефону ${libraryInfo.phone} или на сайте ${libraryInfo.website}.`;
    }
    
    return {
      success: true,
      info: infoResponse
    };
    
  } catch (error) {
    console.error('Ошибка в функции getLibraryInfo:', error);
    return {
      success: false,
      error: error.message,
      info: 'Произошла ошибка при получении информации. Пожалуйста, попробуйте позже.'
    };
  }
}

module.exports = {
  getLibraryInfo
}; 