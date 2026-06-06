import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { ProfileService } from './profile.service';
import { GcsService } from '../../core/gcs/gcs.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller({
  path: 'profile',
  version: '1',
})
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly gcsService: GcsService,
  ) {}

  @Get()
  getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  /**
   * GET /profile/me — returns profile + cart in one request.
   * The frontend calls this once on app init instead of two separate
   * /profile and /cart round trips, cutting cold-load latency in half.
   */
  @Get('me')
  getMe(@Req() req: any) {
    return this.profileService.getMe(req.user.id, req.user.guestId);
  }

  @Patch()
  updateProfile(@Req() req: any, @Body() dto: any) {
    return this.profileService.updateProfile(
      req.user.id,
      dto,
    );
  }

  @Delete()
  deleteAccount(@Req() req: any) {
    return this.profileService.deleteAccount(
      req.user.id,
    );
  }

  @Post('address')
  addAddress(@Req() req: any, @Body() dto: any) {
    return this.profileService.addAddress(req.user.id, dto);
  }

  @Patch('address/:id')
  updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.profileService.updateAddress(
      req.user.id,
      id,
      dto,
    );
  }

  @Delete('address/:id')
  deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.profileService.deleteAddress(req.user.id, id);
  }

  /**
   * POST /profile/upload
   * Uploads file to Google Cloud Storage and returns the public URL.
   * Frontend then calls PATCH /profile with { profileImage: url } or { backgroundImage: url }.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided.');

    const ALLOWED_MIME = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/bmp',
    ]);

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". ` +
        'Allowed formats: JPEG, PNG, WebP, GIF, AVIF, BMP.',
      );
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File too large. Maximum size is 10 MB.');
    }

    const url = await this.gcsService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'profile',
    );
    return { url };
  }

  /**
   * GET /profile/file/:filename
   * Serves locally-stored uploads (disk fallback when GCS_BUCKET_NAME is not set).
   * In production on GKE, GCS is used and this endpoint is never reached.
   */
  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found.');
    }
    return res.sendFile(filePath);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/users')
  getAllUsers(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
  ) {
    return this.profileService.getAllUsers(
      Number(page ?? 1),
      Number(limit ?? 20),
      search,
    );
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/users/:id')
  getUserById(@Param('id') id: string) {
    return this.profileService.getUserById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: number,
  ) {
    return this.profileService.updateUserStatus(id, status);
  }

}
