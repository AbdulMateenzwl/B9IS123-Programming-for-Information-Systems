// src/budgets/schemas/budget.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true, collection: 'budgets' })
export class Budget {
  @Prop({
    type: Types.ObjectId,
    ref: 'Department',
    required: true,
  })
  departmentId: Types.ObjectId;

  @Prop({ required: true })
  fiscalYear: number;

  @Prop({ required: true, min: 0.01 })
  totalBudget: number;

  @Prop({ default: 0, min: 0 })
  spentAmount: number;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

// Virtual: remainingBudget
BudgetSchema.virtual('remainingBudget').get(function (this: BudgetDocument) {
  return this.totalBudget - this.spentAmount;
});

BudgetSchema.set('toJSON', { virtuals: true });

// Unique index: one budget per department per fiscal year
BudgetSchema.index({ departmentId: 1, fiscalYear: 1 }, { unique: true });
