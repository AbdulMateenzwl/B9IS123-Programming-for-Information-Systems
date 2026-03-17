// src/items/items.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Item, ItemDocument } from './schemas/item.schema';
import { Claim, ClaimDocument, ClaimStatus } from '../claims/schemas/claim.schema';
import { UserRole } from '../users/schemas/user.schema';
import { IsEnum, IsNumber, IsString, IsDateString, IsBoolean, IsOptional, Min } from 'class-validator';
import { ExpenseCategory } from './schemas/item.schema';

export class CreateItemDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  expenseDate: string;

  @IsString()
  itemDescription: string;

  @IsOptional()
  @IsBoolean()
  receiptRequired?: boolean;
}

export class UpdateItemDto {
  category?: ExpenseCategory;
  amount?: number;
  expenseDate?: string;
  itemDescription?: string;
  receiptRequired?: boolean;
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name)  private itemModel: Model<ItemDocument>,
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
  ) {}

  async findByClaim(claimId: string) {
    return this.itemModel.find({ claimId }).lean();
  }

  async create(claimId: string, dto: CreateItemDto, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Claim not found.');

    this.assertOwner(claim, currentUser);
    this.assertEditable(claim);

    const item = await this.itemModel.create({
      claimId,
      ...dto,
      expenseDate: new Date(dto.expenseDate),
    });

    // Sync total amount on claim
    await this.syncClaimTotal(claimId);

    return item;
  }

  async update(claimId: string, itemId: string, dto: UpdateItemDto, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Claim not found.');

    this.assertOwner(claim, currentUser);
    this.assertEditable(claim);

    const item = await this.itemModel.findOneAndUpdate(
      { _id: itemId, claimId },
      { ...dto, ...(dto.expenseDate && { expenseDate: new Date(dto.expenseDate) }) },
      { new: true },
    );
    if (!item) throw new NotFoundException('Item not found.');

    await this.syncClaimTotal(claimId);
    return item;
  }

  async delete(claimId: string, itemId: string, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Claim not found.');

    this.assertOwner(claim, currentUser);
    this.assertEditable(claim);

    const item = await this.itemModel.findOneAndDelete({ _id: itemId, claimId });
    if (!item) throw new NotFoundException('Item not found.');

    await this.syncClaimTotal(claimId);
    return { message: 'Item deleted.' };
  }

  private assertOwner(claim: ClaimDocument, currentUser: any) {
    const isOwner = claim.employeeId.toString() === currentUser._id.toString();
    if (!isOwner && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
  }

  private assertEditable(claim: ClaimDocument) {
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new UnprocessableEntityException('Items can only be modified on Draft claims.');
    }
  }

  private async syncClaimTotal(claimId: string) {
    const items = await this.itemModel.find({ claimId });
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    await this.claimModel.findByIdAndUpdate(claimId, {
      totalAmount: Math.round(total * 100) / 100,
    });
  }
}
