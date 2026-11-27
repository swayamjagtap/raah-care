import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CuraCardAccessOutcome } from './cura-card.service.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

@Catch(ForbiddenException)
@Injectable()
export class CuraCardUnauthorizedAuditFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AuthenticatedRequest>();
    const res = ctx.getResponse();

    const targetUrl = req?.originalUrl || req?.url || '';

    // If an authenticated caller attempts /cura-card/resolve with an unauthorized role (e.g. DISPATCHER, SYSTEM_ADMIN, PATIENT)
    if (req?.user && targetUrl.includes('/cura-card/resolve')) {
      try {
        await this.prisma.curaCardAudit.create({
          data: {
            patientId: null,
            responderId: req.user.userId,
            responderRole: req.user.role,
            outcome: CuraCardAccessOutcome.UNAUTHORIZED,
            caseId: req.body?.caseId ?? null,
          },
        });
      } catch {
        // Audit logging failure must never prevent or alter the security rejection
      }
    }

    const status = exception.getStatus ? exception.getStatus() : HttpStatus.FORBIDDEN;
    const response = exception.getResponse();

    if (typeof response === 'object') {
      res.status(status).json(response);
    } else {
      res.status(status).json({
        statusCode: status,
        message: response || exception.message,
        error: 'Forbidden',
      });
    }
  }
}
