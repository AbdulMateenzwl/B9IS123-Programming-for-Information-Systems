import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';
import { Claim, ClaimDocument } from '../claims/schemas/claim.schema';
import { UserRole } from '../users/schemas/user.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectModel(Attachment.name) private attachmentModel: Model<AttachmentDocument>,
    @InjectModel(Claim.name)      private claimModel: Model<ClaimDocument>,
  ) {}

  async upload(claimId: string, file: Express.Multer.File, currentUser: any) {
    const claim = await this.claimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Claim not found.');

    const isOwner = claim.employeeId.toString() === currentUser._id.toString();
    if (!isOwner && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }

    const ext      = path.extname(file.originalname).slice(1).toUpperCase();
    const sizeKB   = Math.ceil(file.size / 1024);

    return this.attachmentModel.create({
      claimId,
      fileName:  file.originalname,
      fileType:  ext,
      fileSizeKB: sizeKB,
      filePath:  file.path,
    });
  }

  async delete(attachmentId: string, currentUser: any) {
    const attachment = await this.attachmentModel
      .findById(attachmentId)
      .populate({ path: 'claimId', select: 'employeeId' });

    if (!attachment) throw new NotFoundException('Attachment not found.');

    const claim    = attachment.claimId as any;
    const isOwner  = claim.employeeId?.toString() === currentUser._id.toString();
    if (!isOwner && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }

    // Delete file from disk
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    await this.attachmentModel.findByIdAndDelete(attachmentId);
    return { message: 'Attachment deleted.' };
  }
}
