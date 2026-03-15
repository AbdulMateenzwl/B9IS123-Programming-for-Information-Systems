// src/budgets/budgets.service.ts
import { Injectable } from '@nestjs/common';
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
}
