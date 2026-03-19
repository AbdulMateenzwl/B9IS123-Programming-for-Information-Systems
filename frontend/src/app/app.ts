import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
})
export class App {
  constructor(public auth: AuthService) {}
  get isAdmin() {
    return this.auth.hasRole('admin');
  }
  get canApprove() {
    return this.auth.hasRole('manager', 'finance_officer', 'admin');
  }
  get canViewBudgets() {
    return this.auth.hasRole('manager', 'finance_officer', 'admin');
  }
}
