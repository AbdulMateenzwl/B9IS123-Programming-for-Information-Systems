// src/workflow/workflow.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { Workflow, WorkflowSchema } from './schemas/workflow.schema';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { WorkflowDecideRateLimitGuard } from '../common/guards/user-rate-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: Claim.name,    schema: ClaimSchema },
      { name: Budget.name,   schema: BudgetSchema },
      { name: User.name,     schema: UserSchema },
      { name: Item.name,     schema: ItemSchema },
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowDecideRateLimitGuard],
  exports: [WorkflowService],
})
export class WorkflowModule {}
