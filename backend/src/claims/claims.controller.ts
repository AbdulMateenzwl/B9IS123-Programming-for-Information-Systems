import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto } from './dto/create-claim.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClaimSubmitRateLimitGuard } from '../common/guards/user-rate-limit.guard';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status')       status?: string,
    @Query('employeeId')   employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<any[]> {
    return this.claimsService.findAll(user, { status, employeeId, departmentId });
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.findById(id, user);
  }

  @Post()
  create(@Body() dto: CreateClaimDto, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClaimDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.claimsService.update(id, dto, user);
  }

  @Post(':id/submit')
  @UseGuards(ClaimSubmitRateLimitGuard)
  submit(@Param('id') id: string, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.submit(id, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.delete(id, user);
  }
}