// src/claims/claims.controller.ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateClaimDto } from './dto/create-claim.dto';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<any[]> {
    return this.claimsService.findAll(user, {
      status,
      employeeId,
      departmentId,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.findById(id, user);
  }

  @Post()
  create(@Body() dto: CreateClaimDto, @CurrentUser() user: any): Promise<any> {
    return this.claimsService.create(dto, user);
  }
}
