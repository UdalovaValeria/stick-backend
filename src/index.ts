import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Загрузка переменнх окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Мидлвары (промежуточные обработчики)
app.use(cors()); // Разрешаем запросы с других доменов (с твоего Vercel)
app.use(express.json()); // Учим сервер понимать JSON

// Тестовый маршрут (чтобы проверить, что всё работает)
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ 
    message: 'Ква! Сервер Stick (to the plan) работает! 🐸',
    time: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🐸 Магия происходит на http://localhost:${PORT}`);
});