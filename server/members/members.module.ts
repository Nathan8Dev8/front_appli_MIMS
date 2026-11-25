import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { DuesModule } from '../dues/dues.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [OnboardingModule, DuesModule, PaymentsModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
