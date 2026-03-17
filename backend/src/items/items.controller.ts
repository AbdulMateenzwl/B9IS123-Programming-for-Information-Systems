import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ItemsService, CreateItemDto, UpdateItemDto } from './items.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('claims/:claimId/items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // GET /api/claims/:claimId/items
  @Get()
  findAll(@Param('claimId') claimId: string) {
    return this.itemsService.findByClaim(claimId);
  }

  // POST /api/claims/:claimId/items
  @Post()
  create(
    @Param('claimId') claimId: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: any,
  ) {
    return this.itemsService.create(claimId, dto, user);
  }
}
