import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { Claim, ClaimSchema } from './schemas/claim.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Workflow, WorkflowSchema } from '../workflow/schemas/workflow.schema';
import { Attachment, AttachmentSchema } from '../attachments/schemas/attachment.schema';
import { ClaimSubmitRateLimitGuard } from '../common/guards/user-rate-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Claim.name,      schema: ClaimSchema },
      { name: Item.name,       schema: ItemSchema },
      { name: Workflow.name,   schema: WorkflowSchema },
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimSubmitRateLimitGuard],
  exports: [ClaimsService, MongooseModule],
})
export class ClaimsModule {}
