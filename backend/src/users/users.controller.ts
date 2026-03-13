// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // GET /api/users
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE_OFFICER)
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({
      departmentId,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // GET /api/users/:id
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE_OFFICER)
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
