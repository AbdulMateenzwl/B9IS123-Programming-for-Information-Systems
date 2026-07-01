import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
})
export class App implements OnInit {
  sidebarOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit() {
    // Close sidebar automatically whenever the route changes (mobile UX)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.sidebarOpen = false; });
  }

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
