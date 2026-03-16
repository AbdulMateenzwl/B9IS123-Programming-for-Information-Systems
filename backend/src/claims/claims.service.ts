import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Claim, ClaimDocument } from './schemas/claim.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import {
  Workflow,
  WorkflowDocument,
} from '../workflow/schemas/workflow.schema';
import {
  Attachment,
  AttachmentDocument,
} from '../attachments/schemas/attachment.schema';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectModel(Claim.name) private claimModel: Model<ClaimDocument>,
    @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
    @InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>,
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
  ) {}

  async findAll(
    currentUser: any,
    filters: { status?: string; employeeId?: string; departmentId?: string },
  ): Promise<any[]> {
    const query: any = {};

    if (currentUser.role === UserRole.EMPLOYEE) {
      query.employeeId = currentUser._id;
    } else {
      if (filters.employeeId) query.employeeId = filters.employeeId;
    }

    if (filters.status) query.status = filters.status;

    const claims = await this.claimModel
      .find(query)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email jobTitle role departmentId',
        populate: { path: 'departmentId', select: 'departmentName location' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      claims.map(async (claim) => {
        const [itemCount, attachmentCount] = await Promise.all([
          this.itemModel.countDocuments({ claimId: claim._id }),
          this.attachmentModel.countDocuments({ claimId: claim._id }),
        ]);
        return { ...claim, itemCount, attachmentCount };
      }),
    );

    return enriched;
  }

  async findById(id: string, currentUser: any): Promise<any> {
    const claim = await this.claimModel
      .findById(id)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email jobTitle role departmentId',
        populate: { path: 'departmentId', select: 'departmentName location' },
      })
      .lean();

    if (!claim) throw new NotFoundException('Claim not found.');

    const employeeId =
      (claim.employeeId as any)._id?.toString() || claim.employeeId.toString();
    if (
      currentUser.role === UserRole.EMPLOYEE &&
      employeeId !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('Access denied.');
    }

    const [items, workflow, attachments] = await Promise.all([
      this.itemModel.find({ claimId: id }).lean(),
      this.workflowModel
        .find({ claimId: id })
        .populate('approverId', 'firstName lastName email role')
        .sort({ stepNumber: 1 })
        .lean(),
      this.attachmentModel.find({ claimId: id }).lean(),
    ]);

    return { claim, items, workflow, attachments };
  }
}
