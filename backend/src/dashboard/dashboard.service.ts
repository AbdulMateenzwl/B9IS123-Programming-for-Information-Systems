// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Claim, ClaimDocument, ClaimStatus } from '../claims/schemas/claim.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { Workflow, WorkflowDocument, WorkflowDecision } from '../workflow/schemas/workflow.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Claim.name)    private claimModel: Model<ClaimDocument>,
    @InjectModel(Item.name)     private itemModel: Model<ItemDocument>,
    @InjectModel(Budget.name)   private budgetModel: Model<BudgetDocument>,
    @InjectModel(User.name)     private userModel: Model<UserDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
  ) {}

  // ── Employee Dashboard ────────────────────────────────────────────────────
  // Shown to employees — their own claims only
  async getEmployeeDashboard(currentUser: any) {
    const userId = currentUser._id;
    const year   = new Date().getFullYear();
    const start  = new Date(`${year}-01-01`);
    const end    = new Date(`${year}-12-31`);

    const [statusCounts, recentClaims, totalApprovedResult, categoryBreakdown] =
      await Promise.all([
        // Count of claims by status
        this.claimModel.aggregate([
          { $match: { employeeId: userId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // 5 most recent claims
        this.claimModel
          .find({ employeeId: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Total approved spend this year
        this.claimModel.aggregate([
          {
            $match: {
              employeeId:     userId,
              status:         ClaimStatus.APPROVED,
              submissionDate: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),

        // Spend breakdown by category (approved claims only)
        this.claimModel
          .find({ employeeId: userId, status: ClaimStatus.APPROVED })
          .select('_id')
          .lean()
          .then(async (approvedClaims) => {
            const ids = approvedClaims.map((c) => c._id);
            return this.itemModel.aggregate([
              { $match: { claimId: { $in: ids } } },
              {
                $group: {
                  _id:        '$category',
                  totalSpend: { $sum: '$amount' },
                  itemCount:  { $sum: 1 },
                },
              },
              { $sort: { totalSpend: -1 } },
            ]);
          }),
      ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s: any) => { counts[s._id] = s.count; });

    return {
      claimSummary: {
        total:       Object.values(counts).reduce((a: number, b: number) => a + b, 0),
        draft:       counts[ClaimStatus.DRAFT]        || 0,
        submitted:   counts[ClaimStatus.SUBMITTED]    || 0,
        underReview: counts[ClaimStatus.UNDER_REVIEW] || 0,
        approved:    counts[ClaimStatus.APPROVED]     || 0,
        rejected:    counts[ClaimStatus.REJECTED]     || 0,
      },
      totalApprovedSpendThisYear: Math.round((totalApprovedResult[0]?.total || 0) * 100) / 100,
      recentClaims,
      spendByCategory: categoryBreakdown.map((c: any) => ({
        category:   c._id,
        totalSpend: Math.round(c.totalSpend * 100) / 100,
        itemCount:  c.itemCount,
      })),
    };
  }

  // ── Manager Dashboard ─────────────────────────────────────────────────────
  // Shown to managers — pending approvals + team overview
  async getManagerDashboard(currentUser: any) {
    const year  = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31`);

    const [
      pendingApprovals,
      allStatusCounts,
      totalApprovedResult,
      recentActivity,
    ] = await Promise.all([
      // Pending workflow steps assigned to this manager
      this.workflowModel
        .find({
          approverId: currentUser._id,
          decision:   WorkflowDecision.PENDING,
        })
        .populate({
          path: 'claimId',
          populate: {
            path:   'employeeId',
            select: 'firstName lastName email departmentId',
            populate: { path: 'departmentId', select: 'departmentName' },
          },
        })
        .lean(),

      // All claims status counts (system-wide)
      this.claimModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Total approved spend this year (system-wide)
      this.claimModel.aggregate([
        {
          $match: {
            status:         ClaimStatus.APPROVED,
            submissionDate: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // 5 most recently submitted claims needing attention
      this.claimModel
        .find({ status: { $in: [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW] } })
        .populate('employeeId', 'firstName lastName email')
        .sort({ submissionDate: -1 })
        .limit(5)
        .lean(),
    ]);

    const counts: Record<string, number> = {};
    allStatusCounts.forEach((s: any) => { counts[s._id] = s.count; });

    return {
      pendingApprovalsCount: pendingApprovals.filter((p) => p.claimId !== null).length,
      pendingApprovals:      pendingApprovals.filter((p) => p.claimId !== null),
      systemClaimSummary: {
        total:       Object.values(counts).reduce((a: number, b: number) => a + b, 0),
        submitted:   counts[ClaimStatus.SUBMITTED]    || 0,
        underReview: counts[ClaimStatus.UNDER_REVIEW] || 0,
        approved:    counts[ClaimStatus.APPROVED]     || 0,
        rejected:    counts[ClaimStatus.REJECTED]     || 0,
      },
      totalApprovedSpendThisYear: Math.round((totalApprovedResult[0]?.total || 0) * 100) / 100,
      recentActivity,
    };
  }

  // ── Finance Dashboard ─────────────────────────────────────────────────────
  // Shown to finance officers — budget utilisation + spend trends
  async getFinanceDashboard() {
    const year  = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31`);

    const [budgetOverview, monthlyTrends, categoryBreakdown, pendingApprovals] =
      await Promise.all([
        // Budget utilisation per department
        this.budgetModel
          .find({ fiscalYear: year })
          .populate('departmentId', 'departmentName location')
          .lean(),

        // Monthly approved spend this year
        this.claimModel.aggregate([
          {
            $match: {
              status:         ClaimStatus.APPROVED,
              submissionDate: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id:            { $month: '$submissionDate' },
              totalApproved:  { $sum: '$totalAmount' },
              claimCount:     { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // System-wide spend by category
        this.claimModel
          .find({ status: ClaimStatus.APPROVED })
          .select('_id')
          .lean()
          .then(async (approvedClaims) => {
            const ids = approvedClaims.map((c) => c._id);
            return this.itemModel.aggregate([
              { $match: { claimId: { $in: ids } } },
              {
                $group: {
                  _id:        '$category',
                  totalSpend: { $sum: '$amount' },
                  itemCount:  { $sum: 1 },
                },
              },
              { $sort: { totalSpend: -1 } },
            ]);
          }),

        // Count of claims awaiting finance review
        this.workflowModel.countDocuments({ decision: WorkflowDecision.PENDING }),
      ]);

    return {
      budgetOverview: budgetOverview.map((b) => ({
        department:      b.departmentId,
        fiscalYear:      b.fiscalYear,
        totalBudget:     b.totalBudget,
        spentAmount:     b.spentAmount,
        remainingBudget: Math.round((b.totalBudget - b.spentAmount) * 100) / 100,
        utilisationPct:  b.totalBudget > 0
          ? Math.round((b.spentAmount / b.totalBudget) * 10000) / 100
          : 0,
      })),
      totalBudgetAllocated: budgetOverview.reduce((sum, b) => sum + b.totalBudget, 0),
      totalSpent:           Math.round(budgetOverview.reduce((sum, b) => sum + b.spentAmount, 0) * 100) / 100,
      totalRemaining:       Math.round(budgetOverview.reduce((sum, b) => sum + (b.totalBudget - b.spentAmount), 0) * 100) / 100,
      monthlyTrends: monthlyTrends.map((m: any) => ({
        month:         m._id,
        totalApproved: Math.round(m.totalApproved * 100) / 100,
        claimCount:    m.claimCount,
      })),
      spendByCategory: categoryBreakdown.map((c: any) => ({
        category:   c._id,
        totalSpend: Math.round(c.totalSpend * 100) / 100,
        itemCount:  c.itemCount,
      })),
      pendingWorkflowSteps: pendingApprovals,
    };
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────
  // Shown to admins — full system overview
  async getAdminDashboard() {
    const year  = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31`);

    const [
      userCounts,
      claimStatusCounts,
      budgetSummary,
      totalApprovedResult,
      recentClaims,
      topSpenders,
    ] = await Promise.all([
      // User counts by role
      this.userModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      // Claims by status
      this.claimModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Budget summary across all departments this year
      this.budgetModel.aggregate([
        { $match: { fiscalYear: year } },
        {
          $group: {
            _id:          null,
            totalBudget:  { $sum: '$totalBudget' },
            totalSpent:   { $sum: '$spentAmount' },
            deptCount:    { $sum: 1 },
          },
        },
      ]),

      // Total approved spend this year
      this.claimModel.aggregate([
        {
          $match: {
            status:         ClaimStatus.APPROVED,
            submissionDate: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // 5 most recent claims (any status)
      this.claimModel
        .find()
        .populate('employeeId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Top 5 spenders this year
      this.claimModel.aggregate([
        {
          $match: {
            status:         ClaimStatus.APPROVED,
            submissionDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id:         '$employeeId',
            totalSpend:  { $sum: '$totalAmount' },
            claimCount:  { $sum: 1 },
          },
        },
        { $sort: { totalSpend: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from:         'users',
            localField:   '_id',
            foreignField: '_id',
            as:           'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $project: {
            totalSpend: { $round: ['$totalSpend', 2] },
            claimCount: 1,
            firstName:  '$employee.firstName',
            lastName:   '$employee.lastName',
            email:      '$employee.email',
            role:       '$employee.role',
          },
        },
      ]),
    ]);

    const userCountMap: Record<string, number> = {};
    userCounts.forEach((u: any) => { userCountMap[u._id] = u.count; });

    const claimCountMap: Record<string, number> = {};
    claimStatusCounts.forEach((c: any) => { claimCountMap[c._id] = c.count; });

    const budget = budgetSummary[0] || { totalBudget: 0, totalSpent: 0, deptCount: 0 };

    return {
      users: {
        total:          Object.values(userCountMap).reduce((a: number, b: number) => a + b, 0),
        employees:      userCountMap[UserRole.EMPLOYEE]       || 0,
        managers:       userCountMap[UserRole.MANAGER]        || 0,
        financeOfficers: userCountMap[UserRole.FINANCE_OFFICER] || 0,
        admins:         userCountMap[UserRole.ADMIN]          || 0,
      },
      claims: {
        total:       Object.values(claimCountMap).reduce((a: number, b: number) => a + b, 0),
        draft:       claimCountMap[ClaimStatus.DRAFT]        || 0,
        submitted:   claimCountMap[ClaimStatus.SUBMITTED]    || 0,
        underReview: claimCountMap[ClaimStatus.UNDER_REVIEW] || 0,
        approved:    claimCountMap[ClaimStatus.APPROVED]     || 0,
        rejected:    claimCountMap[ClaimStatus.REJECTED]     || 0,
      },
      budget: {
        departmentsWithBudget: budget.deptCount,
        totalAllocated:        Math.round(budget.totalBudget * 100) / 100,
        totalSpent:            Math.round(budget.totalSpent * 100) / 100,
        totalRemaining:        Math.round((budget.totalBudget - budget.totalSpent) * 100) / 100,
        utilisationPct:        budget.totalBudget > 0
          ? Math.round((budget.totalSpent / budget.totalBudget) * 10000) / 100
          : 0,
      },
      totalApprovedSpendThisYear: Math.round((totalApprovedResult[0]?.total || 0) * 100) / 100,
      recentClaims,
      topSpendersThisYear: topSpenders,
    };
  }
}
