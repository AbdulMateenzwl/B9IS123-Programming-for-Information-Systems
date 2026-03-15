// src/departments/departments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';

export class CreateDepartmentDto {
  departmentName: string;
  location: string;
  managerName: string;
}

export class UpdateDepartmentDto {
  departmentName?: string;
  location?: string;
  managerName?: string;
  isActive?: boolean;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
  ) {}

  async findAll() {
    return this.deptModel.find({ isActive: true }).lean();
  }

  async findById(id: string) {
    const dept = await this.deptModel.findById(id).lean();
    if (!dept) throw new NotFoundException('Department not found.');
    return dept;
  }
}
