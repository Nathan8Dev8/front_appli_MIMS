import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CronController } from './cron.controller';
import { DuesModule } from '../dues/dues.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DuesModule, NotificationsModule],
  controllers: [CronController],
  providers: [JobsService],
})
export class JobsModule {}
