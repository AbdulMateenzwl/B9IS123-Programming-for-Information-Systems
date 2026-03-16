// src/items/schemas/item.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ItemDocument = Item & Document;

export enum ExpenseCategory {
  TRAVEL        = 'Travel',
  ACCOMMODATION = 'Accommodation',
  MEALS         = 'Meals',
  EQUIPMENT     = 'Equipment',
  TRAINING      = 'Training',
  SUBSCRIPTIONS = 'Subscriptions',
  ENTERTAINMENT = 'Entertainment',
  OTHER         = 'Other',
}

@Schema({ timestamps: true, collection: 'items' })
export class Item {
  @Prop({
    type: Types.ObjectId,
    ref: 'Claim',
    required: true,
  })
  claimId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ExpenseCategory,
    required: true,
  })
  category: ExpenseCategory;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true })
  expenseDate: Date;

  @Prop({ required: true, trim: true })
  itemDescription: string;

  @Prop({ default: true })
  receiptRequired: boolean;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

ItemSchema.index({ claimId: 1 });
