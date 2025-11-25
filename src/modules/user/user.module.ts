import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from '@modules/user/user.service';
import { UsersController } from '@modules/user/user.controller';
import { User } from '@modules/user/user.entity';
import { PaymentHistory } from '@modules/user/payment-history.entity';
import { BalanceRepository } from '@modules/user/balance.repository';

@Module({
  imports: [CacheModule.register(), TypeOrmModule.forFeature([User, PaymentHistory])],
  controllers: [UsersController],
  providers: [UsersService, BalanceRepository],
})
export class UsersModule {}
