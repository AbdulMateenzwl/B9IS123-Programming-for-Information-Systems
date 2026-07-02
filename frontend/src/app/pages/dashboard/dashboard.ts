import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  loading = true;
  error = '';
  role = '';

  employeeData?: EmployeeDashboard;
  managerData?: ManagerDashboard;
  financeData?: FinanceDashboard;
  adminData?: AdminDashboard;

  @ViewChild('employeeCategoryCanvas') employeeCategoryCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('managerStatusCanvas') managerStatusCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('financeBudgetCanvas') financeBudgetCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('adminStatusCanvas') adminStatusCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('adminSpendersCanvas') adminSpendersCanvas?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  private readonly PALETTE = [
    '#007aff',
    '#34c759',
    '#ff9500',
    '#ff3b30',
    '#af52de',
    '#30b0c7',
    '#ffcc00',
    '#ff2d55',
    '#5856d6',
    '#00c7be',
  ];

  private chartsInitialized = false;

  ngAfterViewChecked() {
    if (!this.loading && !this.chartsInitialized) {
      this.initCharts();
      this.chartsInitialized = true;
    }
  }

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

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private initCharts() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    // Employee — spend by category doughnut
    if (this.employeeCategoryCanvas && this.employeeData?.spendByCategory.length) {
      this.charts.push(
        new Chart(this.employeeCategoryCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: this.employeeData.spendByCategory.map((c) => c.category),
            datasets: [
              {
                data: this.employeeData.spendByCategory.map((c) => c.totalSpend),
                backgroundColor: this.PALETTE.slice(0, this.employeeData.spendByCategory.length),
              },
            ],
          },
          options: { plugins: { legend: { position: 'bottom' } } },
        }),
      );
    }

    // Manager — system claim status doughnut
    if (this.managerStatusCanvas && this.managerData) {
      const s = this.managerData.systemClaimSummary;
      this.charts.push(
        new Chart(this.managerStatusCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: ['Submitted', 'Under Review', 'Approved', 'Rejected'],
            datasets: [
              {
                data: [s.submitted, s.underReview, s.approved, s.rejected],
                backgroundColor: ['#007aff', '#ff9500', '#34c759', '#ff3b30'],
              },
            ],
          },
          options: { plugins: { legend: { position: 'bottom' } } },
        }),
      );
    }

    // Finance — budget utilisation horizontal stacked bar
    if (this.financeBudgetCanvas && this.financeData?.budgetOverview.length) {
      const depts = this.financeData.budgetOverview;
      this.charts.push(
        new Chart(this.financeBudgetCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: depts.map((d) => d.department.departmentName),
            datasets: [
              {
                label: 'Spent (£)',
                data: depts.map((d) => d.spentAmount),
                backgroundColor: '#ff3b30',
              },
              {
                label: 'Remaining (£)',
                data: depts.map((d) => d.remainingBudget),
                backgroundColor: '#34c759',
              },
            ],
          },
          options: {
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { x: { stacked: true }, y: { stacked: true } },
          },
        }),
      );
    }

    // Admin — claims by status doughnut
    if (this.adminStatusCanvas && this.adminData) {
      const c = this.adminData.claims;
      this.charts.push(
        new Chart(this.adminStatusCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'],
            datasets: [
              {
                data: [c.draft, c.submitted, c.underReview, c.approved, c.rejected],
                backgroundColor: ['#8e8e93', '#007aff', '#ff9500', '#34c759', '#ff3b30'],
              },
            ],
          },
          options: { plugins: { legend: { position: 'bottom' } } },
        }),
      );
    }

    // Admin — top spenders bar chart
    if (this.adminSpendersCanvas && this.adminData?.topSpendersThisYear.length) {
      const spenders = this.adminData.topSpendersThisYear;
      this.charts.push(
        new Chart(this.adminSpendersCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: spenders.map((s) => `${s.firstName} ${s.lastName}`),
            datasets: [
              {
                label: 'Total Spend (£)',
                data: spenders.map((s) => s.totalSpend),
                backgroundColor: '#af52de',
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        }),
      );
    }
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
