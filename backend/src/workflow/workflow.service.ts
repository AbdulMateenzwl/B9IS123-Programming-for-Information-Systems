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

  async setup(claimId: string, dto: SetupWorkflowDto, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Claim not found.');

    if (claim.status !== ClaimStatus.SUBMITTED) {
      throw new UnprocessableEntityException(
        'Workflow can only be set up for Submitted claims.',
      );
    }

    // BR09: Minimum 2 steps
    if (dto.steps.length < 2) {
      throw new UnprocessableEntityException(
        'BR09: A minimum of 2 approval steps is required.',
      );
    }

    // Validate step numbers are sequential starting at 1
    const sorted = [...dto.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].stepNumber !== i + 1) {
        throw new BadRequestException(
          'BR10: Steps must be numbered sequentially starting from 1.',
        );
      }
    }

    // Validate all approvers have correct role (BR03)
    for (const step of dto.steps) {
      const approver = await this.userModel.findById(step.approverId);
      if (!approver)
        throw new NotFoundException(`Approver ${step.approverId} not found.`);
      if (
        ![UserRole.MANAGER, UserRole.FINANCE_OFFICER, UserRole.ADMIN].includes(
          approver.role,
        )
      ) {
        throw new UnprocessableEntityException(
          `BR03: Approver ${approver.firstName} ${approver.lastName} must have role Manager, Finance Officer, or Admin.`,
        );
      }
      // BR08: Cannot approve own claim
      if (approver._id.toString() === claim.employeeId.toString()) {
        throw new UnprocessableEntityException(
          'BR08: An employee cannot approve their own claim.',
        );
      }
    }

    // Clear any existing workflow steps and create new ones
    await this.workflowModel.deleteMany({ claimId });

    const created = await this.workflowModel.insertMany(
      dto.steps.map((s) => ({
        claimId: new Types.ObjectId(claimId),
        approverId: new Types.ObjectId(s.approverId),
        stepNumber: s.stepNumber,
        decision: WorkflowDecision.PENDING,
      })),
    );

    // Move claim to Under Review
    claim.status = ClaimStatus.UNDER_REVIEW;
    await claim.save();

    return { message: 'Workflow configured.', steps: created };
  }
}
