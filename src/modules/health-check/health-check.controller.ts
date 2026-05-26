import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';

@Public()
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
