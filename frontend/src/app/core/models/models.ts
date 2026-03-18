// src/app/core/models/models.ts

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  role: 'employee' | 'manager' | 'finance_officer' | 'admin';
  departmentId: Department | string;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  _id: string;
  departmentName: string;
  location: string;
  managerName: string;
  isActive: boolean;
}

export interface Claim {
  _id: string;
  employeeId: User | string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  submissionDate: string | null;
  description: string;
  totalAmount: number;
  currency: string;
  itemCount?: number;
  attachmentCount?: number;
  createdAt: string;
}

export interface Item {
  _id: string;
  claimId: string;
  category: string;
  amount: number;
  expenseDate: string;
  itemDescription: string;
  receiptRequired: boolean;
}

export interface WorkflowStep {
  _id: string;
  claimId: string;
  approverId: User | string;
  stepNumber: number;
  decision: 'Pending' | 'Approved' | 'Rejected';
  decisionDate: string | null;
  comments: string | null;
}

export interface Budget {
  _id: string;
  departmentId: Department | string;
  fiscalYear: number;
  totalBudget: number;
  spentAmount: number;
  remainingBudget?: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface EmployeeDashboard {
  claimSummary: { total: number; draft: number; submitted: number; underReview: number; approved: number; rejected: number; };
  totalApprovedSpendThisYear: number;
  recentClaims: Claim[];
  spendByCategory: { category: string; totalSpend: number; itemCount: number; }[];
}

export interface ManagerDashboard {
  pendingApprovalsCount: number;
  pendingApprovals: WorkflowStep[];
  systemClaimSummary: { total: number; submitted: number; underReview: number; approved: number; rejected: number; };
  totalApprovedSpendThisYear: number;
  recentActivity: Claim[];
}

export interface FinanceDashboard {
  budgetOverview: { department: Department; fiscalYear: number; totalBudget: number; spentAmount: number; remainingBudget: number; utilisationPct: number; }[];
  totalBudgetAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  monthlyTrends: { month: number; totalApproved: number; claimCount: number; }[];
  spendByCategory: { category: string; totalSpend: number; itemCount: number; }[];
  pendingWorkflowSteps: number;
}

export interface AdminDashboard {
  users: { total: number; employees: number; managers: number; financeOfficers: number; admins: number; };
  claims: { total: number; draft: number; submitted: number; underReview: number; approved: number; rejected: number; };
  budget: { departmentsWithBudget: number; totalAllocated: number; totalSpent: number; totalRemaining: number; utilisationPct: number; };
  totalApprovedSpendThisYear: number;
  recentClaims: Claim[];
  topSpendersThisYear: { firstName: string; lastName: string; email: string; totalSpend: number; claimCount: number; }[];
}
