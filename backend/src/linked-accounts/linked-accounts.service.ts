import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class LinkedAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    return this.prisma.linkedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        expiresAt: true,
      },
    });
  }

   getMicrosoftAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.MS_REDIRECT_URI!,
      response_mode: 'query',
      scope: 'User.Read offline_access Files.Read',
      state: Math.random().toString(36).substring(2, 15),
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async linkMicrosoftAccount(userId: number, code: string) {
    const tokenRes = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID!,
        client_secret: process.env.MS_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MS_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const meRes = await axios.get(
      'https://graph.microsoft.com/v1.0/me',
      { headers: { Authorization: `Bearer ${access_token}` } },
    );

    const providerUser = meRes.data.id;
    const email = meRes.data.mail ?? meRes.data.userPrincipalName;

    return this.prisma.linkedAccount.upsert({
      where: {
        provider_providerUser: {
          provider: 'microsoft',
          providerUser,
        },
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        userId,
        provider: 'microsoft',
        providerUser,
        email,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });
  }

  async unlink(id: number, userId: number) {
    const account = await this.prisma.linkedAccount.findUnique({
      where: { id },
    });

    if (!account || account.userId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.linkedAccount.delete({ where: { id } });

    return { success: true };
  }
}
