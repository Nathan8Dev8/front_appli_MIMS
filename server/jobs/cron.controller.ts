import { Controller, Get, NotFoundException, Param, Req, UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { EventsService } from '../events/events.service';
import { QuizzesService } from '../quizzes/quizzes.service';

/**
 * Tâches automatiques. Sur Vercel il n'y a pas de serveur allumé en continu :
 * ce sont les Cron Jobs de Vercel (vercel.json, une fois par jour max en gratuit)
 * et cron-job.org (« hourly », toutes les heures) qui appellent ces adresses.
 * Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <CRON_SECRET> »).
 */
@SkipThrottle()
@Controller('cron')
export class CronController {
  constructor(private readonly moduleRef: ModuleRef) {}

  private get = <T>(type: new (...args: any[]) => T) => this.moduleRef.get(type, { strict: false });

  private readonly jobs: Record<string, () => Promise<unknown>> = {
    // Heures en UTC dans vercel.json ; le Cameroun est à UTC+1 toute l'année.
    'monthly-dues': () => this.get(JobsService).monthlyDueJob(),
    morning: async () => {
      await this.get(JobsService).cotisationReminderJob();
      await this.get(JobsService).birthdayJob();
    },
    'complaints-reminder': () => this.get(ComplaintsService).unansweredReminder(),
    'extend-series': () => this.get(EventsService).extendSeries(),
    'quiz-weekly': () => this.get(QuizzesService).weeklyQuizReminder(),
    'quiz-monthly': () => this.get(QuizzesService).monthlyRewardReminder(),
    hourly: async () => {
      await this.get(JobsService).eventReminderJob();
      await this.get(JobsService).pollClosingJob();
    },
  };

  @Get(':job')
  async run(@Param('job') job: string, @Req() req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw new UnauthorizedException();
    const fn = this.jobs[job];
    if (!fn) throw new NotFoundException();
    await fn();
    return { ok: true, job };
  }
}
