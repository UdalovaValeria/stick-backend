import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkAuth } from './middleware/auth';
import { taskController } from './controllers/taskController';
import taskRoutes from './routes/tasks';

// Загружаем переменные из .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем "переводчика" для базы данных
const prisma = new PrismaClient(); 

// Наш секретный ключ для пропусков (токенов)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Мидлвары
app.use(cors()); 
app.use(express.json());

// 🐸 Тестовый маршрут
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'Ква! Сервер работает! 🐸' });
});

// ==========================================
// 1. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
// ==========================================
app.post('/api/register', async (req: Request, res: Response): Promise<any> => {
  try {
    // Достаем данные, которые прислал фронтенд
    const { email, password, name } = req.body;

    // Проверяем, есть ли уже такой email в базе
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Шифруем пароль (10 - это сложность шифрования)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя в базе
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // Сохраняем ТОЛЬКО зашифрованный пароль!
        name,
      },
    });

    res.status(201).json({ 
      message: 'Пользователь успешно создан! 🎉', 
      userId: user.id 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ==========================================
// 2. ВХОД (ЛОГИН)
// ==========================================
app.post('/api/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    // 1. Ищем пользователя по email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // 2. Сравниваем пароль, который ввел юзер, с зашифрованным в базе
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // 3. Создаем JWT-токен (пропуск). Он будет действовать 7 дней.
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // 4. Отдаем токен и данные пользователя (БЕЗ ПАРОЛЯ!) фронтенду
    res.json({
      message: 'Успешный вход! 🐸',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ==========================================
// 3. ПОДКЛЮЧЕНИЕ МАРШРУТОВ (ROUTES)
// ==========================================
app.use('/api/tasks', taskRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🐸 Магия происходит на http://localhost:${PORT}`);
});