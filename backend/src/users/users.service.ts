// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (exists) throw new ConflictException('Email already registered.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash,
    });

    const { passwordHash: _, ...safeUser } = user.toObject();
    return safeUser;
  }

  async findAll(filters: {
    departmentId?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const query: any = {};
    if (filters.departmentId) query.departmentId = filters.departmentId;
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return this.userModel.find(query).select('-passwordHash').lean();
  }

  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .lean();

    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true })
      .select('-passwordHash')
      .lean();

    if (!user) throw new NotFoundException('User not found.');
    return user;
  }
}
