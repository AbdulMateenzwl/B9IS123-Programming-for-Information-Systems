import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Claim, ClaimDocument, ClaimStatus } from './schemas/claim.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import { Workflow, WorkflowDocument } from '../workflow/schemas/workflow.schema';
import { Attachment, AttachmentDocument } from '../attachments/schemas/attachment.schema';
import { CreateClaimDto, UpdateClaimDto } from './dto/create-claim.dto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectModel(Claim.name)      private claimModel: Model<ClaimDocument>,
    @InjectModel(Item.name)       private itemModel: Model<ItemDocument>,
    @InjectModel(Workflow.name)   private workflowModel: Model<WorkflowDocument>,
    @InjectModel(Attachment.name) private attachmentModel: Model<AttachmentDocument>,
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

    const employeeId = (claim.employeeId as any)._id?.toString() || claim.employeeId.toString();
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

  async create(dto: CreateClaimDto, currentUser: any): Promise<any> {
    const claim = await this.claimModel.create({
      employeeId:  currentUser._id,
      description: dto.description,
      currency:    dto.currency || 'GBP',
      status:      ClaimStatus.DRAFT,
      totalAmount: 0,
    });

    return claim.populate({
      path: 'employeeId',
      select: 'firstName lastName email jobTitle',
    });
  }

  async update(id: string, dto: UpdateClaimDto, currentUser: any): Promise<any> {
    const claim = await this.claimModel.findById(id);
    if (!claim) throw new NotFoundException('Claim not found.');

    this.assertOwner(claim, currentUser);
    this.assertDraft(claim);

    Object.assign(claim, dto);
    await claim.save();
    return claim;
  }

  async submit(id: string, currentUser: any): Promise<any> {
    const claim = await this.claimModel.findById(id);
    if (!claim) throw new NotFoundException('Claim not found.');

    this.assertOwner(claim, currentUser);
    this.assertDraft(claim);

    const itemCount = await this.itemModel.countDocuments({ claimId: id });
    if (itemCount === 0) {
      throw new UnprocessableEntityException(
        'BR04: A claim must have at least one expense item before submission.',
      );
    }

    claim.status         = ClaimStatus.SUBMITTED;
    claim.submissionDate = new Date();
    await claim.save();

    return { message: 'Claim submitted successfully.', claim };
  }

  async delete(id: string, currentUser: any): Promise<any> {
    const claim = await this.claimModel.findById(id);
    if (!claim) throw new NotFoundException('Claim not found.');

    const isOwner = claim.employeeId.toString() === currentUser._id.toString();
    if (!isOwner && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }

    if (claim.status !== ClaimStatus.DRAFT && currentUser.role !== UserRole.ADMIN) {
      throw new UnprocessableEntityException('Only Admin can delete non-Draft claims.');
    }

    await Promise.all([
      this.claimModel.findByIdAndDelete(id),
      this.itemModel.deleteMany({ claimId: id }),
      this.workflowModel.deleteMany({ claimId: id }),
      this.attachmentModel.deleteMany({ claimId: id }),
    ]);

    return { message: 'Claim deleted.' };
  }

  private assertOwner(claim: ClaimDocument, currentUser: any): void {
    const isOwner = claim.employeeId.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied.');
  }

  private assertDraft(claim: ClaimDocument): void {
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new UnprocessableEntityException('Only Draft claims can be modified.');
    }
  }

  async syncTotalAmount(claimId: string): Promise<number> {
    const items = await this.itemModel.find({ claimId });
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    await this.claimModel.findByIdAndUpdate(claimId, { totalAmount: total });
    return total;
  }
}