import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip;
    const phone = req.body?.phone;

    const requestId =
      req.requestContext?.get?.('requestId') ||
      'no-request-id';

    const guestId = req?.user?.guestId || 'no-guest';

    let token = `${ip}:${requestId}`;
    if(phone){
      token = `${ip}:${requestId}:${phone}`;
    } else if (guestId){
      token = `${ip}:${requestId}:${guestId}`;
    }

    return token;
  }

  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    return `${throttlerName}:${tracker}`;
  }
}
