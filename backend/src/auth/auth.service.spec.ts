// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { User } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';

// ── Mock factory helpers ──────────────────────────────────────────────────────
const mockUser = {
  _id: '64f1a2b3c4d5e6f7a8b9c0d1',
  firstName: 'Tom',
  lastName: 'Bradley',
  email: 'tom.bradley@deloitteedge.co.uk',
  passwordHash: 'hashed_password',
  role: 'employee',
  isActive: true,
  departmentId: { _id: '64f1a2b3c4d5e6f7a8b9c0e1', departmentName: 'Audit' },
  save: jest.fn().mockResolvedValue(true),
};

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test_secret',
      JWT_EXPIRES_IN: '8h',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key];
  }),
};

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── login() ────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('should return token and user on valid credentials', async () => {
      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'tom.bradley@deloitteedge.co.uk',
        password: 'Password123!',
      });

      expect(result.token).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('tom.bradley@deloitteedge.co.uk');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.login({
          email: 'nobody@deloitteedge.co.uk',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
        }),
      });

      await expect(
        service.login({
          email: 'tom.bradley@deloitteedge.co.uk',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({
          email: 'tom.bradley@deloitteedge.co.uk',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not return passwordHash in the response', async () => {
      mockUserModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'tom.bradley@deloitteedge.co.uk',
        password: 'Password123!',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  // ── refresh() ──────────────────────────────────────────────────────────────
  describe('refresh()', () => {
    it('should return a new token on valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
      });

      const result = await service.refresh('valid_refresh_token');
      expect(result.token).toBe('mock_jwt_token');
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on expired refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refresh('expired_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── changePassword() ───────────────────────────────────────────────────────
  describe('changePassword()', () => {
    it('should update password when current password is correct', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('new_hashed_password' as never);

      const result = await service.changePassword(
        mockUser._id,
        'Password123!',
        'NewPassword123!',
      );

      expect(result.message).toBe('Password updated successfully.');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword(
          mockUser._id,
          'WrongPassword',
          'NewPassword123!',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password is too short', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(
        service.changePassword(mockUser._id, 'Password123!', 'short'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(
          'nonexistent_id',
          'Password123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
