import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveStatus } from './leave.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateLeaveDto) {
    return this.leavesService.create(req.user.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'userId', required: false })
  async findAll(@Query('userId') userId?: string) {
    return this.leavesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leavesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.leavesService.updateStatus(id, status, rejectionReason);
  }
}
