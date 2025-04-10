const { Router } = require("express");
const BookController = require("../controller/BookController");
const ChatController = require("../controller/ChatController");
const smartLibrarian = require('../SmartLibrarian');

const db_router = new Router();

db_router.post("/search", BookController.searchBooks);
// db_router.post("/chat", ChatController.chat);
// db_router.post("/chat/clear", ChatController.clearChat);

// Добавляем новый маршрут для умного чат-бота
db_router.post('/smart-chat', async (req, res) => {
    try {
        const { message, token } = req.body;
        const response = await smartLibrarian.chat(message, token);
        res.json(response);
    } catch (error) {
        console.error('Ошибка в маршруте smart-chat:', error);
        res.status(500).json({
            error: 'Внутренняя ошибка сервера',
            details: error.message
        });
    }
});

module.exports = db_router;
