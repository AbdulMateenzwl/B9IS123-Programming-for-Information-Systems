// src/app/pages/users/users.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, DepartmentsService } from '../../core/services/api.service';
import { User, Department } from '../../core/models/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  departments: Department[] = [];
  loading = true;
  saving = false;
  error = '';
  successMsg = '';
  formError = '';
  showForm = false;
  editingUser?: User;
  filterRole = '';
  filterActive = '';

  form: any = {
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    role: 'employee',
    departmentId: '',
    password: '',
  };

  constructor(
    private usersService: UsersService,
    private deptsService: DepartmentsService,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.deptsService.getAll().subscribe({ next: (d) => (this.departments = d) });
  }

  loadUsers() {
    this.loading = true;
    const filters: any = {};
    if (this.filterRole) filters.role = this.filterRole;
    if (this.filterActive) filters.isActive = this.filterActive === 'true';
    this.usersService.getAll(filters).subscribe({
      next: (u) => {
        this.users = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to load users.';
        this.loading = false;
      },
    });
  }

  openCreate() {
    this.editingUser = undefined;
    this.form = {
      firstName: '',
      lastName: '',
      email: '',
      jobTitle: '',
      role: 'employee',
      departmentId: '',
      password: '',
    };
    this.formError = '';
    this.showForm = true;
  }

  openEdit(u: User) {
    this.editingUser = u;
    const deptId =
      typeof u.departmentId === 'object' ? (u.departmentId as any)._id : u.departmentId;
    this.form = {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      jobTitle: u.jobTitle,
      role: u.role,
      departmentId: deptId,
    };
    this.formError = '';
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingUser = undefined;
    this.formError = '';
  }

  saveUser() {
    const { firstName, lastName, email, jobTitle, role, departmentId, password } = this.form;
    if (!firstName || !lastName || !email || !jobTitle || !role || !departmentId) {
      this.formError = 'Please fill in all required fields.';
      return;
    }
    if (!this.editingUser && !password) {
      this.formError = 'Password is required for new users.';
      return;
    }

    this.saving = true;
    this.formError = '';

    const obs = this.editingUser
      ? this.usersService.update(this.editingUser._id, {
          firstName,
          lastName,
          jobTitle,
          role,
          departmentId,
        })
      : this.usersService.create(this.form);

    obs.subscribe({
      next: () => {
        this.successMsg = this.editingUser ? 'User updated.' : 'User created.';
        this.saving = false;
        this.cancelForm();
        this.loadUsers();
      },
      error: (e) => {
        this.formError = e.error?.error || 'Failed to save user.';
        this.saving = false;
      },
    });
  }

  deactivate(u: User) {
    if (!confirm(`Deactivate ${u.firstName} ${u.lastName}?`)) return;
    this.usersService.deactivate(u._id).subscribe({
      next: () => {
        this.successMsg = 'User deactivated.';
        this.loadUsers();
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to deactivate user.';
      },
    });
  }

  getDeptName(u: User) {
    const d = u.departmentId as any;
    return typeof d === 'object' ? d.departmentName : '—';
  }

  getRoleBadge(role: string) {
    const map: Record<string, string> = {
      employee: 'badge badge-employee',
      manager: 'badge badge-manager',
      finance_officer: 'badge badge-finance',
      admin: 'badge badge-admin',
    };
    return map[role] || 'badge';
  }
}
