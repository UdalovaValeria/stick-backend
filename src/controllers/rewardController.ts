import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const rewardController = {
  // 1. Получить все свои награды ("Витрина")
  getRewards: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rewards = await prisma.reward.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: 'Не удалось загрузить награды' });
    }
  },

  // 2. Создать новую награду (Мечту)
  createReward: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, cost, emoji, isGuilty } = req.body;
      
      const newReward = await prisma.reward.create({
        data: {
          title,
          cost: Number(cost), // Защита от дурака (превращаем в число)
          emoji: emoji || '🎁',
          isGuilty: isGuilty || false,
          userId: req.userId!
        }
      });
      res.status(201).json(newReward);
    } catch (error) {
      res.status(500).json({ error: 'Не удалось создать награду' });
    }
  },

  // 3. ПОКУПКА НАГРАДЫ (Списание баллов) 💳
  claimReward: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rewardId = req.params.id as string;
      const userId = req.userId!;

      // 1. Ищем награду
      const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
      if (!reward || reward.userId !== userId) {
        res.status(404).json({ error: 'Награда не найдена' });
        return;
      }

      if (reward.status === 'used') {
        res.status(400).json({ error: 'Ты уже использовал эту награду!' });
        return;
      }

      // 2. Ищем пользователя, чтобы проверить баланс
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return; // TypeScript параноик, делаем проверку

      // 3. ХВАТАЕТ ЛИ ДЕНЕГ?
      if (user.balance < reward.cost) {
        res.status(400).json({ 
          error: 'Не хватает баллов! 😢', 
          need: reward.cost, 
          have: user.balance 
        });
        return;
      }

      // 4. ТРАНЗАКЦИЯ (Покупаем!)
      // Используем $transaction, чтобы списание и запись в историю произошли одновременно
      await prisma.$transaction([
        // Вычитаем баллы
        prisma.user.update({
          where: { id: userId },
          data: { balance: { decrement: reward.cost } }
        }),
        // Меняем статус награды на used
        prisma.reward.update({
          where: { id: rewardId },
          data: { status: 'used' }
        }),
        // Делаем запись в журнал трат!
        prisma.transaction.create({
          data: {
            userId: userId,
            amount: reward.cost,
            type: 'spend',
            note: `Потрачено на: ${reward.title}`
          }
        })
      ]);

      res.json({ 
        message: 'Награда твоя! Наслаждайся без чувства вины! 💕',
        newBalance: user.balance - reward.cost
      });

    } catch (error) {
      res.status(500).json({ error: 'Ошибка при покупке награды' });
    }
  },

  // 4. Удалить награду (передумал копить)
  deleteReward: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rewardId = req.params.id as string;

      const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
      if (!reward || reward.userId !== req.userId) {
         res.status(404).json({ error: 'Награда не найдена' });
         return;
      }

      await prisma.reward.delete({ where: { id: rewardId } });
      res.json({ message: 'Награда удалена из витрины' });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при удалении' });
    }
  }
};