import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Claim, ClaimSchema } from './schemas/claim.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Workflow, WorkflowSchema } from '../workflow/schemas/workflow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Claim.name, schema: ClaimSchema },
      { name: Item.name, schema: ItemSchema },
      { name: Workflow.name, schema: WorkflowSchema },
    ]),
  ],

  exports: [MongooseModule],
})
export class ClaimsModule {}
