import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Param,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller({
  path: 'profile',
  version: '1',
})
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueName + extname(file.originalname));
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { file };
  }

}
