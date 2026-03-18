// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Claim, Item, WorkflowStep, Budget, Department,
  User, EmployeeDashboard, ManagerDashboard, FinanceDashboard, AdminDashboard
} from '../models/models';

// ── Claims ────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private API = '/api/claims';
  constructor(private http: HttpClient) {}

  getAll(filters?: { status?: string }): Observable<Claim[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<Claim[]>(this.API, { params });
  }

  getById(id: string): Observable<{ claim: Claim; items: Item[]; workflow: WorkflowStep[]; attachments: any[] }> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  create(data: { description: string; currency: string }): Observable<Claim> {
    return this.http.post<Claim>(this.API, data);
  }

  update(id: string, data: Partial<Claim>): Observable<Claim> {
    return this.http.patch<Claim>(`${this.API}/${id}`, data);
  }

  submit(id: string): Observable<any> {
    return this.http.post(`${this.API}/${id}/submit`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }
}

// ── Items ─────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(private http: HttpClient) {}

  getAll(claimId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`/api/claims/${claimId}/items`);
  }

  create(claimId: string, data: Partial<Item>): Observable<Item> {
    return this.http.post<Item>(`/api/claims/${claimId}/items`, data);
  }

  update(claimId: string, itemId: string, data: Partial<Item>): Observable<Item> {
    return this.http.patch<Item>(`/api/claims/${claimId}/items/${itemId}`, data);
  }

  delete(claimId: string, itemId: string): Observable<any> {
    return this.http.delete(`/api/claims/${claimId}/items/${itemId}`);
  }
}

// ── Workflow ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private API = '/api/workflow';
  constructor(private http: HttpClient) {}

  getPending(): Observable<WorkflowStep[]> {
    return this.http.get<WorkflowStep[]>(`${this.API}/pending`);
  }

  setup(claimId: string, steps: { approverId: string; stepNumber: number }[]): Observable<any> {
    return this.http.post(`${this.API}/${claimId}/setup`, { steps });
  }

  decide(claimId: string, decision: 'Approved' | 'Rejected', comments?: string): Observable<any> {
    return this.http.post(`${this.API}/${claimId}/decide`, { decision, comments });
  }
}

// ── Departments ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private API = '/api/departments';
  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.API);
  }

  create(data: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.API, data);
  }

  update(id: string, data: Partial<Department>): Observable<Department> {
    return this.http.patch<Department>(`${this.API}/${id}`, data);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UsersService {
  private API = '/api/users';
  constructor(private http: HttpClient) {}

  getAll(filters?: { role?: string; isActive?: boolean }): Observable<User[]> {
    let params = new HttpParams();
    if (filters?.role)     params = params.set('role', filters.role);
    if (filters?.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    return this.http.get<User[]>(this.API, { params });
  }

  create(data: Partial<User> & { password: string }): Observable<User> {
    return this.http.post<User>(this.API, data);
  }

  update(id: string, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.API}/${id}`, data);
  }

  deactivate(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }
}

// ── Budgets ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private API = '/api/budgets';
  constructor(private http: HttpClient) {}

  getAll(fiscalYear?: number): Observable<Budget[]> {
    let params = new HttpParams();
    if (fiscalYear) params = params.set('fiscalYear', String(fiscalYear));
    return this.http.get<Budget[]>(this.API, { params });
  }

  create(data: { departmentId: string; fiscalYear: number; totalBudget: number }): Observable<Budget> {
    return this.http.post<Budget>(this.API, data);
  }

  update(id: string, data: { totalBudget: number }): Observable<Budget> {
    return this.http.patch<Budget>(`${this.API}/${id}`, data);
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private API = '/api/dashboard';
  constructor(private http: HttpClient) {}

  getEmployee(): Observable<EmployeeDashboard>  { return this.http.get<EmployeeDashboard>(`${this.API}/employee`); }
  getManager():  Observable<ManagerDashboard>   { return this.http.get<ManagerDashboard>(`${this.API}/manager`); }
  getFinance():  Observable<FinanceDashboard>   { return this.http.get<FinanceDashboard>(`${this.API}/finance`); }
  getAdmin():    Observable<AdminDashboard>     { return this.http.get<AdminDashboard>(`${this.API}/admin`); }
}

// ── Reports ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private API = '/api/reports';
  constructor(private http: HttpClient) {}

  byDepartment(fiscalYear?: number): Observable<any[]> {
    let params = new HttpParams();
    if (fiscalYear) params = params.set('fiscalYear', String(fiscalYear));
    return this.http.get<any[]>(`${this.API}/by-department`, { params });
  }

  byEmployee(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/by-employee`);
  }

  byCategory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/by-category`);
  }

  monthlyTrends(year?: number): Observable<any[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', String(year));
    return this.http.get<any[]>(`${this.API}/monthly-trends`, { params });
  }
}
