require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sequelize = require("./db");
const router = require("./routes/db_router");


const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.json());

app.use("/", router);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("Успешно соединен с базой данных");

    // Синхронизируем модели с базой данных
    await sequelize.sync({ alter: true });
    console.log("✅ Модели синхронизированы!");

    app.listen(PORT, () => {
      console.log(`Сервер работает на порту ${PORT}`);
    });
  } catch (e) {
    console.log("Error starting server:", e);
  }
};

start();
