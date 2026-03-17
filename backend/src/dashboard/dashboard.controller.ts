// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard/employee
  // Any authenticated user can see their own employee dashboard
  @Get('employee')
  getEmployeeDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getEmployeeDashboard(user);
  }

  // GET /api/dashboard/manager
  @Get('manager')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  getManagerDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getManagerDashboard(user);
  }

  // GET /api/dashboard/finance
  @Get('finance')
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMIN)
  getFinanceDashboard() {
    return this.dashboardService.getFinanceDashboard();
  }

  // GET /api/dashboard/admin
  @Get('admin')
  @Roles(UserRole.ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
