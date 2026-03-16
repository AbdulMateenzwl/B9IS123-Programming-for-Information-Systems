import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WorkflowService, SetupWorkflowDto, DecisionDto } from './workflow.service';
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

  // POST /api/workflow/:claimId/setup
  @Post(':claimId/setup')
  @Roles(UserRole.MANAGER, UserRole.FINANCE_OFFICER, UserRole.ADMIN)
  setup(
    @Param('claimId') claimId: string,
    @Body() dto: SetupWorkflowDto,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.setup(claimId, dto, user);
  }

  // POST /api/workflow/:claimId/decide
  @Post(':claimId/decide')
  @Roles(UserRole.MANAGER, UserRole.FINANCE_OFFICER, UserRole.ADMIN)
  decide(
    @Param('claimId') claimId: string,
    @Body() dto: DecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.decide(claimId, dto, user);
  }
}
