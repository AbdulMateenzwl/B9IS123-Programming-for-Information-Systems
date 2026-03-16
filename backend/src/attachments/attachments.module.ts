// src/attachments/attachments.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attachment, AttachmentSchema } from './schemas/attachment.schema';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attachment.name, schema: AttachmentSchema },
      { name: Claim.name,      schema: ClaimSchema },
    ]),
  ],
})
export class AttachmentsModule {}
