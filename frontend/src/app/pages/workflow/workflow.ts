// src/app/pages/workflow/workflow.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WorkflowService, ClaimsService, UsersService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Claim, User, WorkflowStep } from '../../core/models/models';

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workflow.html',
})
export class WorkflowComponent implements OnInit {
  pendingSteps: WorkflowStep[] = [];
  submittedClaims: Claim[] = [];
  eligibleApprovers: User[] = [];

  loadingPending = true;
  settingUp = false;
  deciding = false;
  decidingId = '';
  decisionComment = '';
  error = '';
  successMsg = '';

  setupForm = {
    claimId: '',
    steps: [{ approverId: '' }, { approverId: '' }] as { approverId: string }[],
  };

  constructor(
    public auth: AuthService,
    private workflowService: WorkflowService,
    private claimsService: ClaimsService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    this.loadPending();
    if (this.canManage) {
      this.loadSubmittedClaims();
      this.loadApprovers();
    }
  }

  get canManage() {
    return this.auth.hasRole('manager', 'finance_officer', 'admin');
  }

  loadPending() {
    this.loadingPending = true;
    this.workflowService.getPending().subscribe({
      next: (s) => {
        this.pendingSteps = s;
        this.loadingPending = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to load pending approvals.';
        this.loadingPending = false;
      },
    });
  }

  loadSubmittedClaims() {
    this.claimsService.getAll({ status: 'Submitted' }).subscribe({
      next: (c) => (this.submittedClaims = c),
    });
  }

  loadApprovers() {
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.eligibleApprovers = users.filter(
          (u) => ['manager', 'finance_officer', 'admin'].includes(u.role) && u.isActive,
        );
      },
    });
  }

  onClaimSelected() {
    this.setupForm.steps = [{ approverId: '' }, { approverId: '' }];
  }

  addStep() {
    this.setupForm.steps.push({ approverId: '' });
  }
  removeStep(i: number) {
    this.setupForm.steps.splice(i, 1);
  }

  setupWorkflow() {
    const { claimId, steps } = this.setupForm;
    if (!claimId) {
      this.error = 'Please select a claim.';
      return;
    }
    if (steps.some((s) => !s.approverId)) {
      this.error = 'Please assign an approver to every step.';
      return;
    }

    this.settingUp = true;
    this.error = '';
    this.successMsg = '';
    const payload = steps.map((s, i) => ({ approverId: s.approverId, stepNumber: i + 1 }));

    this.workflowService.setup(claimId, payload).subscribe({
      next: () => {
        this.successMsg = 'Workflow configured successfully.';
        this.settingUp = false;
        this.setupForm = { claimId: '', steps: [{ approverId: '' }, { approverId: '' }] };
        this.loadSubmittedClaims();
        this.loadPending();
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to configure workflow.';
        this.settingUp = false;
      },
    });
  }

  startDecide(step: WorkflowStep) {
    this.decidingId = step._id;
    this.decisionComment = '';
    this.error = '';
    this.successMsg = '';
  }

  decide(step: WorkflowStep, decision: 'Approved' | 'Rejected') {
    this.deciding = true;
    this.error = '';
    this.workflowService.decide(this.getClaimId(step), decision, this.decisionComment).subscribe({
      next: (res) => {
        this.successMsg = res.message || `Claim ${decision.toLowerCase()}.`;
        this.deciding = false;
        this.decidingId = '';
        this.loadPending();
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to record decision.';
        this.deciding = false;
      },
    });
  }

  getClaimId(step: any) {
    return step.claimId?._id || step.claimId;
  }
  getClaimDesc(step: any) {
    return step.claimId?.description || '—';
  }
  getClaimAmount(step: any) {
    return step.claimId?.totalAmount || 0;
  }
  getClaimEmployee(step: any) {
    const e = step.claimId?.employeeId;
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }
  getEmployeeName(c: Claim) {
    const e = c.employeeId as any;
    return typeof e === 'object' ? `${e.firstName} ${e.lastName}` : '—';
  }
}
