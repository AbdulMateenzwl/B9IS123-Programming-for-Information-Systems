// src/app/pages/departments/departments.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentsService } from '../../core/services/api.service';
import { Department } from '../../core/models/models';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departments.html',
})
export class DepartmentsComponent implements OnInit {
  departments: Department[] = [];
  loading = true;
  saving = false;
  error = '';
  successMsg = '';
  formError = '';
  showForm = false;
  editingDept?: Department;

  form = { departmentName: '', location: '', managerName: '' };

  constructor(private deptsService: DepartmentsService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.deptsService.getAll().subscribe({
      next: (d) => {
        this.departments = d;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to load departments.';
        this.loading = false;
      },
    });
  }

  openCreate() {
    this.editingDept = undefined;
    this.form = { departmentName: '', location: '', managerName: '' };
    this.formError = '';
    this.showForm = true;
  }

  openEdit(d: Department) {
    this.editingDept = d;
    this.form = {
      departmentName: d.departmentName,
      location: d.location,
      managerName: d.managerName,
    };
    this.formError = '';
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingDept = undefined;
    this.formError = '';
  }

  saveDept() {
    const { departmentName, location, managerName } = this.form;
    if (!departmentName || !location || !managerName) {
      this.formError = 'All fields are required.';
      return;
    }
    this.saving = true;
    this.formError = '';

    const obs = this.editingDept
      ? this.deptsService.update(this.editingDept._id, this.form)
      : this.deptsService.create(this.form);

    obs.subscribe({
      next: () => {
        this.successMsg = this.editingDept ? 'Department updated.' : 'Department created.';
        this.saving = false;
        this.cancelForm();
        this.load();
      },
      error: (e) => {
        this.formError = e.error?.error || 'Failed to save department.';
        this.saving = false;
      },
    });
  }
}
