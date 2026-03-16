// src/items/items.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from './schemas/item.schema';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemSchema },
      { name: Claim.name, schema: ClaimSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ItemsModule {}
