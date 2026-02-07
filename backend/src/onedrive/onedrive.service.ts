import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { LinkedAccountsService } from '../linked-accounts/linked-accounts.service';

@Injectable()
export class OneDriveService {
  constructor(private readonly linkedAccountsService: LinkedAccountsService) {}

  private async getAccessToken(userId: number) {
    const token = await this.linkedAccountsService.getValidMicrosoftToken(userId);
    if (!token) throw new BadRequestException('No Microsoft account linked');
    return token;
  }

  async listFiles(userId: number, folderId?: string) {
    const token = await this.getAccessToken(userId);
    const url = folderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.value;
  }

  async getFileMetadata(userId: number, itemId: string) {
    const token = await this.getAccessToken(userId);
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.data;
  }

  async downloadFile(userId: number, itemId: string) {
    const token = await this.getAccessToken(userId);
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data);
  }
}