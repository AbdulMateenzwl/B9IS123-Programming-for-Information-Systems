// src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/api.service';
import {
  AdminDashboard,
  EmployeeDashboard,
  FinanceDashboard,
  ManagerDashboard,
} from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  error = '';
  role = '';

  employeeData?: EmployeeDashboard;
  managerData?: ManagerDashboard;
  financeData?: FinanceDashboard;
  adminData?: AdminDashboard;

  constructor(
    public auth: AuthService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit() {
    this.role = this.auth.currentUser?.role || '';
    const loaders: Record<string, () => void> = {
      employee: () =>
        this.dashboardService.getEmployee().subscribe({
          next: (d) => {
            this.employeeData = d;
            this.loading = false;
          },
          error: (e) => this.handleError(e),
        }),
      manager: () =>
        this.dashboardService.getManager().subscribe({
          next: (d) => {
            this.managerData = d;
            this.loading = false;
          },
          error: (e) => this.handleError(e),
        }),
      finance_officer: () =>
        this.dashboardService.getFinance().subscribe({
          next: (d) => {
            this.financeData = d;
            this.loading = false;
          },
          error: (e) => this.handleError(e),
        }),
      admin: () =>
        this.dashboardService.getAdmin().subscribe({
          next: (d) => {
            this.adminData = d;
            this.loading = false;
          },
          error: (e) => this.handleError(e),
        }),
    };
    (
      loaders[this.role] ||
      (() => {
        this.loading = false;
      })
    )();
  }

  handleError(e: any) {
    this.error = e.error?.error || 'Failed to load dashboard.';
    this.loading = false;
  }

  getBadge(status: string) {
    const map: Record<string, string> = {
      Draft: 'badge badge-draft',
      Submitted: 'badge badge-submitted',
      'Under Review': 'badge badge-review',
      Approved: 'badge badge-approved',
      Rejected: 'badge badge-rejected',
    };
    return map[status] || 'badge';
  }

  getClaim(w: any) {
    return w.claimId;
  }
  getEmployee(w: any) {
    const e = w.claimId?.employeeId;
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }
}
