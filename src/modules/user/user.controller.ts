import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UsersService } from '@modules/user/user.service';
import { DebitDto } from '@modules/user/dto/debit.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserWithBalance(id);
  }

  @Post(':id/debit')
  async debit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DebitDto,
  ): Promise<{ balance: number }> {
    return this.usersService.debitUser(id, dto.amount);
  }

  @Post(':id/credit')
  async credit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DebitDto,
  ): Promise<{ balance: number }> {
    return this.usersService.creditUser(id, dto.amount);
  }
}
