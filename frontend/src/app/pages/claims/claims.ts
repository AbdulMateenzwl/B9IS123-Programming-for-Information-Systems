import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClaimsService } from '../../core/services/api.service';
import { Claim } from '../../core/models/models';

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './claims.html',
})
export class ClaimsComponent implements OnInit {
  claims: Claim[] = [];
  loading = true;
  error = '';
  successMsg = '';
  showForm = false;
  saving = false;
  formError = '';
  filterStatus = '';

  form = { description: '', currency: 'EUR' };

  constructor(private claimsService: ClaimsService) {}

  ngOnInit() {
    this.loadClaims();
  }

  loadClaims() {
    this.loading = true;
    this.error = '';
    const filters = this.filterStatus ? { status: this.filterStatus } : undefined;
    this.claimsService.getAll(filters).subscribe({
      next: (c) => {
        this.claims = c;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to load claims.';
        this.loading = false;
      },
    });
  }

  createClaim() {
    if (!this.form.description.trim()) {
      this.formError = 'Description is required.';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.claimsService.create(this.form).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.form = { description: '', currency: 'EUR' };
        this.successMsg = 'Claim created.';
        this.loadClaims();
      },
      error: (e) => {
        this.formError = e.error?.error || 'Failed to create claim.';
        this.saving = false;
      },
    });
  }

  submitClaim(c: Claim) {
    if (!confirm(`Submit claim "${c.description}"?`)) return;
    this.claimsService.submit(c._id).subscribe({
      next: () => {
        this.successMsg = 'Claim submitted successfully.';
        this.loadClaims();
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to submit claim.';
      },
    });
  }

  deleteClaim(c: Claim) {
    if (!confirm(`Delete claim "${c.description}"?`)) return;
    this.claimsService.delete(c._id).subscribe({
      next: () => {
        this.successMsg = 'Claim deleted.';
        this.loadClaims();
      },
      error: (e) => {
        this.error = e.error?.error || 'Failed to delete claim.';
      },
    });
  }

  getEmployeeName(c: Claim) {
    const e = c.employeeId as any;
    return typeof e === 'object' ? `${e.firstName} ${e.lastName}` : '—';
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
}
