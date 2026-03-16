import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Workflow,
  WorkflowDocument,
  WorkflowDecision,
} from './schemas/workflow.schema';
import {
  Claim,
  ClaimDocument,
  ClaimStatus,
} from '../claims/schemas/claim.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsMongoId,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkflowStepDto {
  @IsMongoId()
  approverId: string;

  @IsNumber()
  stepNumber: number;
}

export class SetupWorkflowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];
}

export class DecisionDto {
  @IsIn(['Approved', 'Rejected'])
  decision: 'Approved' | 'Rejected';

  @IsOptional()
  @IsString()
  comments?: string;
}

@Injectable()
export class WorkflowService {
  constructor(
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
  ) {}

  async getPendingForApprover(currentUser: any) {
    const pendingSteps = await this.workflowModel
      .find({ approverId: currentUser._id, decision: WorkflowDecision.PENDING })
      .populate({
        path: 'claimId',
        match: {
          status: { $in: [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW] },
        },
        populate: {
          path: 'employeeId',
          select: 'firstName lastName email departmentId',
          populate: { path: 'departmentId', select: 'departmentName' },
        },
      })
      .lean();

    // Filter out nulls (populate match removed them)
    return pendingSteps.filter((s) => s.claimId !== null);
  }
}
