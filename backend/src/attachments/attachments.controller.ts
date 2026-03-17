import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const multerStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const multerFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('BR15: Only PDF, JPG, JPEG, PNG files are allowed.'), false);
  }
};

@Controller('attachments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  // POST /api/attachments/:claimId
  @Post(':claimId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter: multerFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('claimId') claimId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.upload(claimId, file, user);
  }

}
