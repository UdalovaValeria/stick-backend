import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const rewardService = {
  // Функция начисления баллов за завершение задачи
  awardTaskCompletion: async (userId: string, taskId: string, difficulty: string) => {
    // 1. Базовые баллы в зависимости от сложности
    let earnedPoints = 10; // По умолчанию за easy
    if (difficulty === 'medium') earnedPoints = 15;
    if (difficulty === 'hard') earnedPoints = 25;

    // 2. Начисляем баллы пользователю
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: earnedPoints }
      }
    });

    // 3. (Опционально) Здесь мы потом можем сделать запись в таблицу Transaction,
    // чтобы пользователь видел историю: "Получено 15 баллов за задачу".

    return earnedPoints;
  }
};