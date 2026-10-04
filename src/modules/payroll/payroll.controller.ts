import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { Payslip } from './payroll.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  async create(@Body() data: Partial<Payslip>) {
    return this.payrollService.create(data);
  }

  @Get()
  @ApiQuery({ name: 'userId', required: false })
  async findAll(@Query('userId') userId?: string) {
    return this.payrollService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.payrollService.findOne(id);
  }
}
