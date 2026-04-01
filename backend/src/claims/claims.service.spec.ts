// src/claims/claims.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ClaimsService } from './claims.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Claim, ClaimStatus } from './schemas/claim.schema';
import { Item } from '../items/schemas/item.schema';
import { Workflow } from '../workflow/schemas/workflow.schema';
import { Attachment } from '../attachments/schemas/attachment.schema';
import { UserRole } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

// ── Shared IDs ────────────────────────────────────────────────────────────────
const employeeId = new Types.ObjectId().toString();
const adminId = new Types.ObjectId().toString();
const claimId = new Types.ObjectId().toString();

// ── Mock users ────────────────────────────────────────────────────────────────
const mockEmployee = { _id: employeeId, role: UserRole.EMPLOYEE };
const mockAdmin = { _id: adminId, role: UserRole.ADMIN };

// ── Mock claim ────────────────────────────────────────────────────────────────
const makeMockClaim = (overrides = {}) => ({
  _id: claimId,
  employeeId,
  status: ClaimStatus.DRAFT,
  description: 'Test claim',
  totalAmount: 0,
  currency: 'GBP',
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ── Mock models ───────────────────────────────────────────────────────────────
const mockClaimModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};

const mockItemModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
};

const mockWorkflowModel = {
  find: jest.fn(),
  deleteMany: jest.fn(),
};

const mockAttachmentModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
};

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('ClaimsService', () => {
  let service: ClaimsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: getModelToken(Claim.name), useValue: mockClaimModel },
        { provide: getModelToken(Item.name), useValue: mockItemModel },
        { provide: getModelToken(Workflow.name), useValue: mockWorkflowModel },
        {
          provide: getModelToken(Attachment.name),
          useValue: mockAttachmentModel,
        },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    jest.clearAllMocks();
  });

  // ── findAll() ──────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    const mockClaims = [makeMockClaim()];

    const mockChain = (data: any[]) => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(data),
    });

    it('should return only own claims for employee role', async () => {
      mockClaimModel.find.mockReturnValue(mockChain(mockClaims));
      mockItemModel.countDocuments.mockResolvedValue(2);
      mockAttachmentModel.countDocuments.mockResolvedValue(1);

      await service.findAll(mockEmployee, {});

      expect(mockClaimModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: mockEmployee._id }),
      );
    });

    it('should return all claims for manager role', async () => {
      const manager = {
        _id: new Types.ObjectId().toString(),
        role: UserRole.MANAGER,
      };
      mockClaimModel.find.mockReturnValue(mockChain(mockClaims));
      mockItemModel.countDocuments.mockResolvedValue(0);
      mockAttachmentModel.countDocuments.mockResolvedValue(0);

      await service.findAll(manager, {});

      const callArg = mockClaimModel.find.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('employeeId');
    });

    it('should apply status filter when provided', async () => {
      mockClaimModel.find.mockReturnValue(mockChain(mockClaims));
      mockItemModel.countDocuments.mockResolvedValue(0);
      mockAttachmentModel.countDocuments.mockResolvedValue(0);

      await service.findAll(mockEmployee, { status: 'Draft' });

      expect(mockClaimModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Draft' }),
      );
    });

    it('should include itemCount and attachmentCount in each result', async () => {
      mockClaimModel.find.mockReturnValue(mockChain(mockClaims));
      mockItemModel.countDocuments.mockResolvedValue(3);
      mockAttachmentModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll(mockEmployee, {});

      expect(result[0]).toHaveProperty('itemCount', 3);
      expect(result[0]).toHaveProperty('attachmentCount', 2);
    });
  });

  // ── findById() ─────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return claim with items, workflow and attachments', async () => {
      const claim = { ...makeMockClaim(), employeeId: { _id: employeeId } };
      mockClaimModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(claim),
      });
      mockItemModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mockWorkflowModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      mockAttachmentModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await service.findById(claimId, mockEmployee);

      expect(result).toHaveProperty('claim');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('attachments');
    });

    it('should throw NotFoundException when claim does not exist', async () => {
      mockClaimModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findById('nonexistent_id', mockEmployee),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when employee tries to view another employees claim', async () => {
      const otherEmployeeId = new Types.ObjectId().toString();
      const claim = {
        ...makeMockClaim(),
        employeeId: { _id: otherEmployeeId },
      };
      mockClaimModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(claim),
      });

      await expect(service.findById(claimId, mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('should create a new Draft claim with employeeId set', async () => {
      const newClaim = makeMockClaim();
      mockClaimModel.create.mockResolvedValue({
        ...newClaim,
        populate: jest.fn().mockResolvedValue(newClaim),
      });

      const result = await service.create(
        { description: 'Test claim', currency: 'GBP' },
        mockEmployee,
      );

      expect(mockClaimModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: mockEmployee._id,
          status: ClaimStatus.DRAFT,
          totalAmount: 0,
        }),
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should update a Draft claim successfully', async () => {
      const claim = makeMockClaim();
      mockClaimModel.findById.mockResolvedValue(claim);

      await service.update(
        claimId,
        { description: 'Updated description' },
        mockEmployee,
      );

      expect(claim.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when claim does not exist', async () => {
      mockClaimModel.findById.mockResolvedValue(null);

      await expect(
        service.update(
          'nonexistent_id',
          { description: 'Update' },
          mockEmployee,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException when claim is not Draft', async () => {
      const claim = makeMockClaim({ status: ClaimStatus.SUBMITTED });
      mockClaimModel.findById.mockResolvedValue(claim);

      await expect(
        service.update(claimId, { description: 'Update' }, mockEmployee),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw ForbiddenException when employee tries to update another employees claim', async () => {
      const otherEmployeeId = new Types.ObjectId().toString();
      const claim = makeMockClaim({ employeeId: otherEmployeeId });
      mockClaimModel.findById.mockResolvedValue(claim);

      await expect(
        service.update(claimId, { description: 'Update' }, mockEmployee),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── submit() ──────────────────────────────────────────────────────────────
  describe('submit()', () => {
    it('should submit a Draft claim that has items — BR04 satisfied', async () => {
      const claim = makeMockClaim();
      mockClaimModel.findById.mockResolvedValue(claim);
      mockItemModel.countDocuments.mockResolvedValue(2);

      const result = await service.submit(claimId, mockEmployee);

      expect(claim.status).toBe(ClaimStatus.SUBMITTED);
      expect(claim.save).toHaveBeenCalled();
      expect(result.message).toBe('Claim submitted successfully.');
    });

    it('should throw UnprocessableEntityException when claim has no items — BR04', async () => {
      const claim = makeMockClaim();
      mockClaimModel.findById.mockResolvedValue(claim);
      mockItemModel.countDocuments.mockResolvedValue(0);

      await expect(service.submit(claimId, mockEmployee)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException when claim is not Draft', async () => {
      const claim = makeMockClaim({ status: ClaimStatus.SUBMITTED });
      mockClaimModel.findById.mockResolvedValue(claim);

      await expect(service.submit(claimId, mockEmployee)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw NotFoundException when claim does not exist', async () => {
      mockClaimModel.findById.mockResolvedValue(null);

      await expect(
        service.submit('nonexistent_id', mockEmployee),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the claim', async () => {
      const otherEmployeeId = new Types.ObjectId().toString();
      const claim = makeMockClaim({ employeeId: otherEmployeeId });
      mockClaimModel.findById.mockResolvedValue(claim);

      await expect(service.submit(claimId, mockEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should delete a Draft claim and all related records', async () => {
      const claim = makeMockClaim();
      mockClaimModel.findById.mockResolvedValue(claim);
      mockClaimModel.findByIdAndDelete.mockResolvedValue(claim);
      mockItemModel.deleteMany.mockResolvedValue({});
      mockWorkflowModel.deleteMany.mockResolvedValue({});
      mockAttachmentModel.deleteMany.mockResolvedValue({});

      const result = await service.delete(claimId, mockEmployee);

      expect(mockItemModel.deleteMany).toHaveBeenCalledWith({ claimId });
      expect(mockWorkflowModel.deleteMany).toHaveBeenCalledWith({ claimId });
      expect(mockAttachmentModel.deleteMany).toHaveBeenCalledWith({ claimId });
      expect(result.message).toBe('Claim deleted.');
    });

    it('should throw NotFoundException when claim does not exist', async () => {
      mockClaimModel.findById.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent_id', mockEmployee),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException when non-admin tries to delete a Submitted claim', async () => {
      const claim = makeMockClaim({ status: ClaimStatus.SUBMITTED });
      mockClaimModel.findById.mockResolvedValue(claim);

      await expect(service.delete(claimId, mockEmployee)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should allow Admin to delete a non-Draft claim', async () => {
      const claim = makeMockClaim({
        status: ClaimStatus.SUBMITTED,
        employeeId: adminId,
      });
      mockClaimModel.findById.mockResolvedValue(claim);
      mockClaimModel.findByIdAndDelete.mockResolvedValue(claim);
      mockItemModel.deleteMany.mockResolvedValue({});
      mockWorkflowModel.deleteMany.mockResolvedValue({});
      mockAttachmentModel.deleteMany.mockResolvedValue({});

      const result = await service.delete(claimId, mockAdmin);

      expect(result.message).toBe('Claim deleted.');
    });
  });
});
