const express = require('express');
const router = express.Router();
const { processRequest } = require('../controllers/RunTools');
const { saveChat, getChats } = require('../models/Chats');
const { processMessage } = require('../services/aiService');

// Маршрут для взаимодействия с AI-ассистентом библиотеки
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Пустое сообщение',
        message: 'Пожалуйста, введите сообщение'
      });
    }
    
    try {
      // Обработка сообщения через LangChain
      const aiResponse = await processMessage(message, sessionId || 'guest');
      
      // Формируем ответ для клиента
      const finalResponse = {
        success: true,
        message: aiResponse.message,
        steps: aiResponse.steps
      };
      
      // Сохраняем сообщение и ответ в истории чата
      if (sessionId) {
        await saveChat(sessionId, message, JSON.stringify(finalResponse));
      }
      
      return res.json(finalResponse);
      
    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error);
      
      // Возвращаем ошибку
      const errorResponse = {
        success: false,
        error: error.message,
        message: 'Извините, произошла ошибка при обработке вашего запроса.'
      };
      
      // Сохраняем сообщение и ошибку в истории чата
      if (sessionId) {
        await saveChat(sessionId, message, JSON.stringify(errorResponse));
      }
      
      return res.json(errorResponse);
    }
    
  } catch (error) {
    console.error('Ошибка в маршруте /chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при обработке запроса'
    });
  }
});

// Маршрут для получения истории чата
router.get('/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Не указан идентификатор сессии',
        message: 'Пожалуйста, укажите идентификатор сессии'
      });
    }
    
    const chats = await getChats(sessionId);
    
    return res.json({
      success: true,
      chats,
      total: chats.length
    });
    
  } catch (error) {
    console.error('Ошибка в маршруте /chat/:sessionId:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при получении истории чата'
    });
  }
});

// НОВЫЕ МАРШРУТЫ ДЛЯ ТЕСТИРОВАНИЯ ФУНКЦИЙ ПОИСКА

// Маршрут для прямого поиска книг
router.post('/search', async (req, res) => {
  try {
    const { author, title, query } = req.body;
    
    console.log('Запрос на поиск книг:', { author, title, query });
    
    // Вызываем processRequest с типом 'book'
    const response = await processRequest({
      type: 'book',
      params: { author, title, query }
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка в маршруте /search:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при поиске книг'
    });
  }
});

// Маршрут для получения информации о библиотеке
router.post('/library-info', async (req, res) => {
  try {
    const { question } = req.body;
    
    console.log('Запрос информации о библиотеке:', { question });
    
    // Вызываем processRequest с типом 'info'
    const response = await processRequest({
      type: 'info',
      params: { question }
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка в маршруте /library-info:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при получении информации о библиотеке'
    });
  }
});

// Маршрут для тестирования поиска книг по имени автора (частый случай)
router.get('/search/author/:name', async (req, res) => {
  try {
    const authorName = req.params.name;
    
    console.log('Тестирование поиска книг по автору:', authorName);
    
    // Вызываем processRequest с типом 'book' и только именем автора
    const response = await processRequest({
      type: 'book',
      params: { author: authorName, title: '', query: '' }
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка в маршруте /search/author/:name:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при поиске книг по автору'
    });
  }
});

// Маршрут для тестирования поиска книг по названию
router.get('/search/title/:title', async (req, res) => {
  try {
    const bookTitle = req.params.title;
    
    console.log('Тестирование поиска книг по названию:', bookTitle);
    
    // Вызываем processRequest с типом 'book' и только названием книги
    const response = await processRequest({
      type: 'book',
      params: { author: '', title: bookTitle, query: '' }
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка в маршруте /search/title/:title:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Произошла ошибка при поиске книг по названию'
    });
  }
});

module.exports = router; 