import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus, WorkMode } from '../attendance.entity';

export class CreateAttendanceDto {
  @ApiProperty({ example: '2026-09-18' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '2026-09-18T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  check_in?: string;

  @ApiPropertyOptional({ example: '2026-09-18T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  check_out?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({ enum: WorkMode, default: WorkMode.OFFICE })
  @IsEnum(WorkMode)
  @IsOptional()
  work_mode?: WorkMode;

  @ApiPropertyOptional({ example: 12.971598 })
  @IsNumber()
  @IsOptional()
  location_lat?: number;

  @ApiPropertyOptional({ example: 77.594562 })
  @IsNumber()
  @IsOptional()
  location_lng?: number;

  @ApiPropertyOptional({ example: 'Worked on-site' })
  @IsString()
  @IsOptional()
  notes?: string;
}
