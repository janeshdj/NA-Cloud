import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payslip } from './payroll.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payslip)
    private readonly payslipRepository: Repository<Payslip>,
  ) {}

  async create(data: Partial<Payslip>): Promise<Payslip> {
    const basic = Number(data.basic_salary || 0);
    const hra = Number(data.house_rent_allowance || 0);
    const special = Number(data.special_allowance || 0);
    const pf = Number(data.provident_fund_deduction || 0);
    const tax = Number(data.tax_deduction || 0);
    const net = basic + hra + special - pf - tax;

    const payslip = this.payslipRepository.create({
      ...data,
      net_salary: net,
    });
    return this.payslipRepository.save(payslip);
  }

  async findAll(userId?: string): Promise<Payslip[]> {
    const where = userId ? { user_id: userId } : {};
    return this.payslipRepository.find({
      where,
      relations: ['user'],
      order: { month_year: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payslip> {
    const payslip = await this.payslipRepository.findOne({ where: { id }, relations: ['user'] });
    if (!payslip) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return payslip;
  }
}
