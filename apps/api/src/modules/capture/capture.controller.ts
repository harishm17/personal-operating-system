import { Body, Controller, Post } from '@nestjs/common';
import { CaptureService } from './capture.service';
import { CreateCaptureDto } from './dto/create-capture.dto';

@Controller()
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Post('/captures')
  async createCapture(@Body() dto: CreateCaptureDto) {
    return this.captureService.createCapture(dto);
  }
}
