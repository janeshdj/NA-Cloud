import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveType } from '../leave.entity';

export class CreateLeaveDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.CASUAL })
  @IsEnum(LeaveType)
  leave_type: LeaveType;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-10-02' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: 2.0 })
  @IsNumber()
  @IsOptional()
  total_days?: number;

  @ApiProperty({ example: 'Family function' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
