import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leave, LeaveStatus } from './leave.entity';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(userId: string, dto: CreateLeaveDto): Promise<Leave> {
    const leave = this.leaveRepository.create({
      ...dto,
      user_id: userId,
      status: LeaveStatus.PENDING,
    });
    const saved = await this.leaveRepository.save(leave);

    this.eventsGateway.emitEvent('leave.applied', saved.id, saved.version, {
      userId: saved.user_id,
      status: saved.status,
    });

    return saved;
  }

  async updateStatus(id: string, status: LeaveStatus, rejectionReason?: string): Promise<Leave> {
    const leave = await this.leaveRepository.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    leave.status = status;
    if (rejectionReason) {
      leave.rejection_reason = rejectionReason;
    }
    leave.version += 1;

    const updated = await this.leaveRepository.save(leave);

    this.eventsGateway.emitEvent('leave.status_changed', updated.id, updated.version, {
      userId: updated.user_id,
      status: updated.status,
    });

    return updated;
  }

  async findAll(userId?: string): Promise<Leave[]> {
    const where = userId ? { user_id: userId } : {};
    return this.leaveRepository.find({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Leave> {
    const leave = await this.leaveRepository.findOne({ where: { id }, relations: ['user'] });
    if (!leave) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }
    return leave;
  }
}
