// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Workflow, WorkflowSchema } from '../workflow/schemas/workflow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Claim.name,    schema: ClaimSchema },
      { name: Item.name,     schema: ItemSchema },
      { name: Budget.name,   schema: BudgetSchema },
      { name: User.name,     schema: UserSchema },
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
