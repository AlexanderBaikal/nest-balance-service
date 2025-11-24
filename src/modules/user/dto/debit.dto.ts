import { IsNumber, IsPositive } from 'class-validator';

export class DebitDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
