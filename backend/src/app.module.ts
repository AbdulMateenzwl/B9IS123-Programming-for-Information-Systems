// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { BudgetsModule } from './budgets/budgets.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ClaimsModule } from './claims/claims.module';
import { ItemsModule } from './items/items.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { DashboardModule } from './dashboard/dashboard.module';

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

    // Rate limiting — 60 requests per minute globally; login overrides to 5
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    DepartmentsModule,
    BudgetsModule,
    WorkflowModule,
    ClaimsModule,
    ItemsModule,
    AttachmentsModule,
    DashboardModule,
  ],
  providers: [
    // Apply rate limiting to every route globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
