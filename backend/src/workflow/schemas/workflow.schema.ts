import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

export enum WorkflowDecision {
  PENDING  = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

@Schema({ timestamps: true, collection: 'workflows' })
export class Workflow {
  @Prop({
    type: Types.ObjectId,
    ref: 'Claim',
    required: true,
  })
  claimId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  approverId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  stepNumber: number;

  @Prop({
    type: String,
    enum: WorkflowDecision,
    default: WorkflowDecision.PENDING,
  })
  decision: WorkflowDecision;

  @Prop({ default: null })
  decisionDate: Date;

  @Prop({ default: null, trim: true })
  comments: string;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);

// One step per claim per step number
WorkflowSchema.index({ claimId: 1, stepNumber: 1 }, { unique: true });
WorkflowSchema.index({ approverId: 1, decision: 1 });
