const SequelizeAuto = require("sequelize-auto");

const auto = new SequelizeAuto("postgres", "postgres", "password", {
  host: "localhost", // Или твой хост
  dialect: "postgres",
  directory: "./models", // Папка, куда будут сохранены файлы моделей
  port: 5432, // Порт PostgreSQL
  additional: {
    timestamps: false, // Убрать createdAt и updatedAt, если не нужны
  },
});

auto.run()
  .then(() => console.log("Модели успешно сгенерированы!"))
  .catch((err) => console.error("Ошибка генерации моделей:", err));
