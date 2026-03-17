import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  jobTitle: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsMongoId()
  departmentId: string;
}

export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  role?: UserRole;
  departmentId?: string;
  isActive?: boolean;
}
