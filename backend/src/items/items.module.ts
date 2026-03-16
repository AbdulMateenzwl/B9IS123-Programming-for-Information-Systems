// src/items/items.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { Item, ItemSchema } from './schemas/item.schema';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Item.name,  schema: ItemSchema },
      { name: Claim.name, schema: ClaimSchema },
    ]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, MongooseModule],
})
export class ItemsModule {}
