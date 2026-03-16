import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttachmentDocument = Attachment & Document;

export enum FileType {
  PDF  = 'PDF',
  JPG  = 'JPG',
  JPEG = 'JPEG',
  PNG  = 'PNG',
}

@Schema({ timestamps: true, collection: 'attachments' })
export class Attachment {
  @Prop({
    type: Types.ObjectId,
    ref: 'Claim',
    required: true,
  })
  claimId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName: string;

  @Prop({
    type: String,
    enum: FileType,
    required: true,
  })
  fileType: FileType;

  @Prop({ required: true, min: 1, max: 10240 })
  fileSizeKB: number;

  @Prop({ required: true })
  filePath: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

AttachmentSchema.index({ claimId: 1 });
