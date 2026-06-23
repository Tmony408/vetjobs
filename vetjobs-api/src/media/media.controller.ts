import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard) // only signed-in users can request an upload URL
export class MediaController {
  constructor(private readonly media: MediaService) {}

  // POST /api/media/upload-url  { fileName, contentType } -> { uploadUrl, key, publicUrl }
  @Post('upload-url')
  create(@CurrentUserId() userId: string, @Body() body: { fileName: string; contentType: string }) {
    return this.media.uploadUrl(body.fileName, body.contentType, userId);
  }
}
