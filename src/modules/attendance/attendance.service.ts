import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(userId: string, dto: CreateAttendanceDto): Promise<Attendance> {
    const attendance = this.attendanceRepository.create({
      ...dto,
      user_id: userId,
      check_in: dto.check_in ? new Date(dto.check_in) : new Date(),
    });
    const saved = await this.attendanceRepository.save(attendance);

    // Broadcast small event via WebSocket gateway
    this.eventsGateway.emitEvent('attendance.updated', saved.id, saved.version, {
      userId: saved.user_id,
      date: saved.date,
    });

    return saved;
  }

  async update(id: string, dto: UpdateAttendanceDto): Promise<Attendance> {
    const record = await this.attendanceRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }

    Object.assign(record, dto);
    if (dto.check_in) record.check_in = new Date(dto.check_in);
    if (dto.check_out) record.check_out = new Date(dto.check_out);
    record.version += 1;

    const updated = await this.attendanceRepository.save(record);

    // Broadcast small event (~100 bytes)
    this.eventsGateway.emitEvent('attendance.updated', updated.id, updated.version, {
      userId: updated.user_id,
      date: updated.date,
    });

    return updated;
  }

  async findAll(date?: string, userId?: string): Promise<Attendance[]> {
    const query = this.attendanceRepository.createQueryBuilder('att')
      .leftJoinAndSelect('att.user', 'user');

    if (date) {
      query.andWhere('att.date = :date', { date });
    }
    if (userId) {
      query.andWhere('att.user_id = :userId', { userId });
    }

    return query.orderBy('att.date', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Attendance> {
    const record = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!record) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }
    return record;
  }
}
