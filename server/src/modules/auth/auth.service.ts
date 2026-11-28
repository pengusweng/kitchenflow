import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateSessionDTO } from './dto/create-session.dto';
import { LoginDTO } from './dto/login.dto';
import { SetupPinDTO } from './dto/setup-pin.dto';
import { assertExists } from '../../shared/assertions/assert-exists';
import { assertValidPin } from '../pin/pin.assertions';
import { PinService } from '../pin/pin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly pinService: PinService,
  ) {}

  getUserProfile(
    user: NonNullable<Awaited<ReturnType<UsersRepository['findOne']>>>,
  ) {
    return user;
  }

  async login(dto: LoginDTO, pin?: string) {
    const user = await this.verifyCredentials(dto);

    if (user.role === UserRole.SUPERADMIN) {
      // Checked only after the password, so PIN status never leaks to a
      // caller who doesn't know it. The client then shows PIN setup.
      if (!(await this.pinService.hasPin(user.user_id))) {
        this.logger.warn(`PIN setup required for superadmin: ${user.user_id}`);

        throw new ForbiddenException({
          code: 'PIN_SETUP_REQUIRED',
          message: 'Set up your 4-digit PIN to finish signing in.',
        });
      }

      if (!pin) {
        this.logger.warn(`PIN required for superadmin login: ${user.user_id}`);

        throw new UnauthorizedException({
          code: 'PIN_REQUIRED',
          message: 'Enter your PIN to sign in.',
        });
      }

      const result = /^[0-9]{4}$/.test(pin)
        ? await this.pinService.verifyPin(user.user_id, pin)
        : ({ status: 'invalid' } as const);

      if (result.status === 'invalid') {
        this.logger.warn(`Invalid PIN for superadmin login: ${user.user_id}`);

        throw new UnauthorizedException({
          code: 'INVALID_PIN',
          message: 'Incorrect PIN.',
        });
      }

      assertValidPin(result);
    }

    return this.issueSession(user);
  }

  /**
   * A superadmin without a PIN sets one up and signs in in one step. The
   * password is checked again here, so this endpoint grants nothing that
   * login with the password would not, and it can only ever create a first
   * PIN: an existing one is never replaced (409 EXISTING_PIN_FOUND).
   */
  async setupPinAndLogin(dto: SetupPinDTO) {
    const user = await this.verifyCredentials(dto);

    if (user.role !== UserRole.SUPERADMIN) {
      this.logger.warn(`PIN setup at sign-in denied for ${user.user_id}`);

      throw new ForbiddenException({
        code: 'PIN_SETUP_NOT_ALLOWED',
        message:
          'Only superadmins set up their PIN while signing in. Sign in first, then set up your PIN.',
      });
    }

    await this.pinService.create({ pin: dto.pin }, user.user_id);
    this.logger.log(`Superadmin ${user.user_id} set up their PIN at sign-in`);

    return this.issueSession(user);
  }

  private async verifyCredentials(dto: LoginDTO) {
    const credentials = await this.usersRepository.findByUsername(dto.username);
    if (
      !credentials ||
      !(await argon2.verify(credentials.password_hash, dto.password))
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    const user = await this.usersRepository.findOne(credentials.user_id);
    assertExists(user, 'User', credentials.user_id, this.logger);

    return user;
  }

  private async issueSession(
    user: NonNullable<Awaited<ReturnType<UsersRepository['findOne']>>>,
  ) {
    const token = randomBytes(32).toString('base64url');
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await this.createSession({
      user_id: user.user_id,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at,
    });

    return {
      token,
      expires_at: session.expires_at,
      user: this.getUserProfile(user),
    };
  }

  async createSession(dto: CreateSessionDTO) {
    const user = await this.usersRepository.findOne(dto.user_id);
    assertExists(user, 'User', dto.user_id, this.logger);

    if (
      !Number.isFinite(dto.expires_at.getTime()) ||
      dto.expires_at.getTime() <= Date.now()
    ) {
      throw new BadRequestException({
        code: 'INVALID_SESSION_EXPIRATION',
        message: 'Session expiration must be in the future.',
      });
    }

    const session = await this.authRepository.create(dto);
    this.logger.log(
      `Created session ${session.session_id} for user ${user.user_id}`,
    );

    return session;
  }

  async findOneSessionByTokenHash(tokenHash: string) {
    const session =
      await this.authRepository.findOneSessionByTokenHash(tokenHash);
    if (!session || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: 'EXPIRED_SESSION',
        message: 'Invalid or expired session.',
      });
    }

    const user = await this.usersRepository.findOne(session.user_id);
    assertExists(user, 'User', session.user_id, this.logger);

    return { ...session, user };
  }

  async validateSession(token: string) {
    if (!token) {
      throw new UnauthorizedException({
        code: 'SESSION_TOKEN_REQUIRED',
        message: 'Session token is required.',
      });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.findOneSessionByTokenHash(tokenHash);
    const updated = await this.updateLastSeen(session.session_id);

    return { ...updated, user: session.user };
  }

  async updateLastSeen(sessionId: string) {
    try {
      return await this.authRepository.updateLastSeen(sessionId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new UnauthorizedException({
          code: 'INVALID_SESSION',
          message: 'Invalid or expired session.',
        });
      }

      throw error;
    }
  }

  async deleteSession(sessionId: string) {
    try {
      const session = await this.authRepository.delete(sessionId);
      this.logger.log(`Deleted session ${sessionId}`);
      return session;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }

  async deleteUserSessions(userId: string) {
    const result = await this.authRepository.deleteMany(userId);
    this.logger.log(`Deleted ${result.count} sessions for user ${userId}`);
    return result;
  }
}
