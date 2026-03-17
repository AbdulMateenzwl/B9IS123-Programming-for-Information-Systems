import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';

@Controller('budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.FINANCE_OFFICER, UserRole.ADMIN)
  findAll(
    @Query('fiscalYear') fiscalYear?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.budgetsService.findAll({
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      departmentId: departmentId || undefined,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body()
    dto: {
      departmentId: string;
      fiscalYear: number;
      totalBudget: number;
    },
  ) {
    return this.budgetsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: { totalBudget?: number }) {
    return this.budgetsService.update(id, dto);
  }
}
