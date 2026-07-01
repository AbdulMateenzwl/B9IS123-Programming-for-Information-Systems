import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface RateEntry {
  hits: number;
  resetAt: number; // UTC ms timestamp at end of current day
}

function endOfTodayUTC(): number {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Limits each employee to 5 claim submissions per calendar day (UTC).
 * Runs after JwtAuthGuard (controller-level) so req.user is populated.
 */
@Injectable()
export class ClaimSubmitRateLimitGuard implements CanActivate {
  private readonly LIMIT = 5;
  private readonly store = new Map<string, RateEntry>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user._id.toString();
    const now = Date.now();

    const entry = this.store.get(userId);

    if (!entry || entry.resetAt < now) {
      // First request today — start fresh
      this.store.set(userId, { hits: 1, resetAt: endOfTodayUTC() });
      return true;
    }

    if (entry.hits >= this.LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Daily limit reached: you may only submit ${this.LIMIT} claims per day.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.hits++;
    return true;
  }
}

/**
 * Limits each approver (manager / finance officer / admin) to 10 claim
 * decisions per calendar day (UTC).
 * Runs after JwtAuthGuard (controller-level) so req.user is populated.
 */
@Injectable()
export class WorkflowDecideRateLimitGuard implements CanActivate {
  private readonly LIMIT = 10;
  private readonly store = new Map<string, RateEntry>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user._id.toString();
    const now = Date.now();

    const entry = this.store.get(userId);

    if (!entry || entry.resetAt < now) {
      this.store.set(userId, { hits: 1, resetAt: endOfTodayUTC() });
      return true;
    }

    if (entry.hits >= this.LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Daily limit reached: you may process at most ${this.LIMIT} claim decisions per day.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.hits++;
    return true;
  }
}
