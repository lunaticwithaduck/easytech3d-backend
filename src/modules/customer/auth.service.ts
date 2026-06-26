import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Customer } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { LoginDto, RegisterDto } from './customer.dto';
import type { AuthResponse, SafeCustomer } from './customer.types';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private safe(c: Customer): SafeCustomer {
    return {
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private async createSession(customerId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.customerSession.create({
      data: { token, customerId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return token;
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.customer.findUnique({ where: { email } })) {
      throw new ConflictException('Този имейл вече е регистриран.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.customer.create({
      data: { email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone ?? null },
    });
    const token = await this.createSession(customer.id);
    return { customer: this.safe(customer), token };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!customer || !(await bcrypt.compare(dto.password, customer.passwordHash))) {
      throw new UnauthorizedException('Грешен имейл или парола.');
    }
    const token = await this.createSession(customer.id);
    return { customer: this.safe(customer), token };
  }

  async logout(token?: string): Promise<void> {
    if (token) await this.prisma.customerSession.deleteMany({ where: { token } });
  }

  async customerFromToken(token?: string): Promise<SafeCustomer | null> {
    if (!token) return null;
    const session = await this.prisma.customerSession.findUnique({
      where: { token },
      include: { customer: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return this.safe(session.customer);
  }

  async customerIdFromToken(token?: string): Promise<string | null> {
    return (await this.customerFromToken(token))?.id ?? null;
  }
}
