// src/claims/schemas/claim.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClaimDocument = Claim & Document;

export enum ClaimStatus {
  DRAFT        = 'Draft',
  SUBMITTED    = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  APPROVED     = 'Approved',
  REJECTED     = 'Rejected',
}

@Schema({ timestamps: true, collection: 'claims' })
export class Claim {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  employeeId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ClaimStatus,
    default: ClaimStatus.DRAFT,
  })
  status: ClaimStatus;

  @Prop({ default: null })
  submissionDate: Date;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ default: 0, min: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: ['GBP', 'USD', 'EUR'],
    default: 'EUR',
  })
  currency: string;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);

ClaimSchema.index({ employeeId: 1, status: 1 });
ClaimSchema.index({ status: 1 });
