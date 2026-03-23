// src/app/pages/budgets/budgets.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetsService, DepartmentsService } from '../../core/services/api.service';
import { Budget, Department } from '../../core/models/models';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.html',
})
export class BudgetsComponent implements OnInit {
  budgets: Budget[] = [];
  departments: Department[] = [];
  loading = true;
  saving = false;
  error = '';
  successMsg = '';
  formError = '';
  showForm = false;
  editingBudget?: Budget;
  filterYear = '';
  years = [2023, 2024, 2025, 2026, 2027];

  form = { departmentId: '', fiscalYear: new Date().getFullYear(), totalBudget: 0 };

  constructor(
    private budgetsService: BudgetsService,
    private deptsService: DepartmentsService,
  ) {}

  ngOnInit() {
    this.load();
    this.deptsService.getAll().subscribe({ next: (d) => (this.departments = d) });
  }

  load() {
    this.loading = true;
    this.budgetsService.getAll(this.filterYear ? +this.filterYear : undefined).subscribe({
      next: (b) => {
        this.budgets = b;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to load budgets.';
        this.loading = false;
      },
    });
  }

  get totalBudget() {
    return this.budgets.reduce((s, b) => s + b.totalBudget, 0);
  }
  get totalSpent() {
    return this.budgets.reduce((s, b) => s + b.spentAmount, 0);
  }
  get totalRemaining() {
    return this.budgets.reduce((s, b) => s + (b.totalBudget - b.spentAmount), 0);
  }
  get overallPct() {
    return this.totalBudget > 0
      ? Math.round((this.totalSpent / this.totalBudget) * 10000) / 100
      : 0;
  }

  getPct(b: Budget) {
    return b.totalBudget > 0 ? Math.round((b.spentAmount / b.totalBudget) * 10000) / 100 : 0;
  }

  openCreate() {
    this.editingBudget = undefined;
    this.form = { departmentId: '', fiscalYear: new Date().getFullYear(), totalBudget: 0 };
    this.formError = '';
    this.showForm = true;
  }

  openEdit(b: Budget) {
    this.editingBudget = b;
    const deptId =
      typeof b.departmentId === 'object' ? (b.departmentId as any)._id : b.departmentId;
    this.form = { departmentId: deptId, fiscalYear: b.fiscalYear, totalBudget: b.totalBudget };
    this.formError = '';
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingBudget = undefined;
    this.formError = '';
  }

  saveBudget() {
    if (!this.form.departmentId || !this.form.fiscalYear || this.form.totalBudget <= 0) {
      this.formError = 'All fields are required and budget must be greater than 0.';
      return;
    }
    this.saving = true;
    this.formError = '';

    const obs = this.editingBudget
      ? this.budgetsService.update(this.editingBudget._id, { totalBudget: this.form.totalBudget })
      : this.budgetsService.create(this.form);

    obs.subscribe({
      next: () => {
        this.successMsg = this.editingBudget ? 'Budget updated.' : 'Budget created.';
        this.saving = false;
        this.cancelForm();
        this.load();
      },
      error: (e) => {
        this.formError = e.error?.error || 'Failed to save budget.';
        this.saving = false;
      },
    });
  }

  getDeptName(b: Budget) {
    const d = b.departmentId as any;
    return typeof d === 'object' ? d.departmentName : '—';
  }
}
