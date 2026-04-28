import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class GroupsService {
  private supabase: SupabaseClient;
  private bucket: string;
  constructor(private readonly prisma: PrismaService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
    this.bucket = process.env.SUPABASE_BUCKET ?? 'documents';
  }

  async uploadGroupImage(groupId: number, file?: Express.Multer.File) {
    const existing = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (existing?.img) {
      await this.deleteImageFromStorage(existing.img);
    }

    if (!file) {
      return this.prisma.group.update({
        where: { id: groupId },
        data: { img: null },
      });
    }

    const ext = path.extname(file.originalname);
    const key = `group-images/${randomUUID()}${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error)
      throw new BadRequestException(`Failed to upload image: ${error.message}`);

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(key);

    return this.prisma.group.update({
      where: { id: groupId },
      data: { img: urlData.publicUrl },
    });
  }

  private async deleteImageFromStorage(imgUrl: string) {
    const marker = `/object/public/${this.bucket}/`;
    const idx = imgUrl.indexOf(marker);
    if (idx === -1) return;
    const key = imgUrl.slice(idx + marker.length);
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([key]);
    if (error)
      console.error(`Failed to delete old group image: ${error.message}`);
  }

  async createGroup(name: string, creatorUserId: number, img?: string) {
    return this.prisma.$transaction(async (prisma) => {
      const group = await prisma.group.create({
        data: {
          name,
          img: img || null,
        },
      });

      await prisma.member.create({
        data: {
          groupId: group.id,
          userId: creatorUserId,
          role: 'OWNER',
        },
      });

      return group;
    });
  }

  async getGroups(userId: number) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
    });
  }

  async getGroupById(id: number) {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async updateGroup(id: number, name?: string, img?: string) {
    return this.prisma.group.update({
      where: { id },
      data: {
        name: name || undefined,
        img: img || undefined,
      },
    });
  }

  async updateGroupAiSettings(
    id: number,
    aiPrompt?: string,
    aiPersonality?: string,
  ) {
    return this.prisma.group.update({
      where: { id },
      data: { aiPrompt, aiPersonality },
    });
  }

  async deleteGroup(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const channels = await prisma.channel.findMany({
        where: { groupId: id },
      });
      for (const channel of channels) {
        await prisma.message.deleteMany({ where: { channelId: channel.id } });
      }

      const files = await prisma.file.findMany({ where: { groupId: id } });
      for (const file of files) {
        await prisma.chunk.deleteMany({ where: { fileId: file.id } });
      }

      // Delete all private chats associated with this group
      await prisma.privateChat.deleteMany({ where: { groupId: id } });

      await prisma.channel.deleteMany({ where: { groupId: id } });
      await prisma.member.deleteMany({ where: { groupId: id } });
      await prisma.file.deleteMany({ where: { groupId: id } });
      await prisma.group.delete({ where: { id } });
    });
  }

  async generateInviteToken(groupId: number) {
    const token = randomBytes(16).toString('hex');
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteToken: token },
    });
    return { token: group.inviteToken };
  }

  async joinByToken(token: string, userId: number) {
    const group = await this.prisma.group.findUnique({
      where: { inviteToken: token },
    });
    if (!group) throw new NotFoundException('Invalid invite link');

    const existing = await this.prisma.member.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) return group;

    await this.prisma.member.create({
      data: { groupId: group.id, userId, role: 'MEMBER' },
    });
    return group;
  }
}
