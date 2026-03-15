// src/budgets/budgets.service.ts
import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
  ) {}

  async findAll(filters: { fiscalYear?: number; departmentId?: string }) {
    const query: any = {};
    if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
    if (filters.departmentId) query.departmentId = filters.departmentId;

    return this.budgetModel
      .find(query)
      .populate('departmentId', 'departmentName location')
      .sort({ fiscalYear: -1 })
      .lean();
  }

  async create(dto: {
    departmentId: string;
    fiscalYear: number;
    totalBudget: number;
  }) {
    if (dto.totalBudget <= 0) {
      throw new UnprocessableEntityException(
        'BR02: Total budget must be greater than 0.',
      );
    }
    const existing = await this.budgetModel.findOne({
      departmentId: dto.departmentId,
      fiscalYear: dto.fiscalYear,
    });
    if (existing)
      throw new ConflictException(
        'Budget for this department and year already exists.',
      );

    return this.budgetModel.create(dto);
  }
}
