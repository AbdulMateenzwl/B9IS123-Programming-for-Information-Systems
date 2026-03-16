// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { BudgetsModule } from './budgets/budgets.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ClaimsModule } from './claims/claims.module';
import { ItemsModule } from './items/items.module';
import { AttachmentsModule } from './attachments/attachments.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    DepartmentsModule,
    BudgetsModule,
    WorkflowModule,
    ClaimsModule,
    ItemsModule,
    AttachmentsModule
  ],
})
export class AppModule {}
