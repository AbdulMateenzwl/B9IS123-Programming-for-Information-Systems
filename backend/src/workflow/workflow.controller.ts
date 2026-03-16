import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // GET /api/workflow/pending
  @Get('pending')
  @Roles(UserRole.MANAGER, UserRole.FINANCE_OFFICER, UserRole.ADMIN)
  getPending(@CurrentUser() user: any) {
    return this.workflowService.getPendingForApprover(user);
  }
}
