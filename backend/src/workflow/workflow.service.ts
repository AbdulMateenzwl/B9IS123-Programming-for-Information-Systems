import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Workflow,
  WorkflowDocument,
  WorkflowDecision,
} from "./schemas/workflow.schema";
import {
  Claim,
  ClaimDocument,
  ClaimStatus,
} from "../claims/schemas/claim.schema";
import { Budget, BudgetDocument } from "../budgets/schemas/budget.schema";
import { User, UserDocument, UserRole } from "../users/schemas/user.schema";
import { Item, ItemDocument } from "../items/schemas/item.schema";

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsMongoId,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

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
  @IsIn(["Approved", "Rejected"])
  decision: "Approved" | "Rejected";

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
        path: "claimId",
        match: {
          status: { $in: [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW] },
        },
        populate: {
          path: "employeeId",
          select: "firstName lastName email departmentId",
          populate: { path: "departmentId", select: "departmentName" },
        },
      })
      .lean();

    // Filter out nulls (populate match removed them)
    return pendingSteps.filter((s) => s.claimId !== null);
  }

  async setup(claimId: string, dto: SetupWorkflowDto, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException("Claim not found.");

    if (claim.status !== ClaimStatus.SUBMITTED) {
      throw new UnprocessableEntityException(
        "Workflow can only be set up for Submitted claims.",
      );
    }

    // BR09: Minimum 2 steps
    if (dto.steps.length < 2) {
      throw new UnprocessableEntityException(
        "BR09: A minimum of 2 approval steps is required.",
      );
    }

    // Validate step numbers are sequential starting at 1
    const sorted = [...dto.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].stepNumber !== i + 1) {
        throw new BadRequestException(
          "BR10: Steps must be numbered sequentially starting from 1.",
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
          "BR08: An employee cannot approve their own claim.",
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

    return { message: "Workflow configured.", steps: created };
  }

  async decide(claimId: string, dto: DecisionDto, currentUser: any) {
    const claim = await this.claimModel.findById(claimId).populate({
      path: "employeeId",
      select: "departmentId",
    });

    if (!claim) throw new NotFoundException("Claim not found.");

    if (
      ![ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW].includes(claim.status)
    ) {
      throw new UnprocessableEntityException(
        "This claim is not awaiting approval.",
      );
    }

    // BR08: Cannot approve own claim
    if (claim.employeeId.toString() === currentUser._id.toString()) {
      throw new ForbiddenException("BR08: You cannot approve your own claim.");
    }

    // Find this approver's pending step
    const myStep = await this.workflowModel.findOne({
      claimId: new Types.ObjectId(claimId),
      approverId: new Types.ObjectId(currentUser._id.toString()),
      decision: WorkflowDecision.PENDING,
    });

    if (!myStep) {
      throw new NotFoundException(
        "No pending approval step found for you on this claim.",
      );
    }

    // BR10: Previous step must be approved first
    if (myStep.stepNumber > 1) {
      const prevStep = await this.workflowModel.findOne({
        claimId: new Types.ObjectId(claimId),
        stepNumber: myStep.stepNumber - 1,
      });
      if (!prevStep || prevStep.decision !== WorkflowDecision.APPROVED) {
        throw new UnprocessableEntityException(
          "BR10: The previous approval step must be completed first.",
        );
      }
    }

    // Record the decision
    myStep.decision = dto.decision as WorkflowDecision;
    myStep.decisionDate = new Date();
    myStep.comments = dto.comments || null;
    await myStep.save();

    // BR11: Rejection halts entire workflow
    if (dto.decision === "Rejected") {
      claim.status = ClaimStatus.REJECTED;
      await claim.save();
      return { message: "Claim rejected. Workflow halted." };
    }

    // Check if this was the final step
    const remainingSteps = await this.workflowModel.countDocuments({
      claimId,
      decision: WorkflowDecision.PENDING,
    });

    const totalSteps = await this.workflowModel.countDocuments({ claimId });

    // BR09: Need at least 2 approved steps for final approval
    const approvedSteps = await this.workflowModel.countDocuments({
      claimId,
      decision: WorkflowDecision.APPROVED,
    });

    if (remainingSteps === 0 && approvedSteps >= 2) {
      // BR12: Check budget before final approval
      await this.checkAndDeductBudget(claim);

      claim.status = ClaimStatus.APPROVED;
      await claim.save();
      return { message: "Claim fully approved." };
    }

    return { message: "Step approved. Awaiting next approver." };
  }

  private async checkAndDeductBudget(claim: ClaimDocument) {
    const employee = await this.userModel.findById(claim.employeeId);
    if (!employee) throw new NotFoundException("Employee not found.");

    const fiscalYear = new Date().getFullYear();
    const budget = await this.budgetModel.findOne({
      departmentId: employee.departmentId,
      fiscalYear,
    });

    if (!budget) {
      throw new UnprocessableEntityException(
        "BR12: No budget record found for this department and fiscal year.",
      );
    }

    const remaining = budget.totalBudget - budget.spentAmount;
    if (claim.totalAmount > remaining) {
      throw new UnprocessableEntityException(
        `BR12: Approving this claim (£${claim.totalAmount}) would exceed the remaining budget (£${remaining.toFixed(2)}).`,
      );
    }

    // Deduct from budget
    budget.spentAmount =
      Math.round((budget.spentAmount + claim.totalAmount) * 100) / 100;
    await budget.save();
  }
}
