import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSources() {
    return this.prisma.source.findMany();
  }

  async createSource(name: string) {
    return this.prisma.source.create({ data: { name } });
  }

  async deleteSource(id: number) {
    return this.prisma.source.delete({ where: { id } });
  }

  async getGroupSources(groupId: number) {
    return this.prisma.groupSource.findMany({
      where: { groupId },
      include: { source: true },
    });
  }

  async addSourceToGroup(groupId: number, sourceId: number) {
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new BadRequestException('Source not found');

    return this.prisma.groupSource.create({
      data: { groupId, sourceId },
      include: { source: true },
    });
  }

  async removeSourceFromGroup(groupId: number, sourceId: number) {
    const entry = await this.prisma.groupSource.findFirst({
      where: { groupId, sourceId },
    });
    if (!entry) throw new BadRequestException('Source not linked to this group');

    return this.prisma.groupSource.delete({ where: { id: entry.id } });
  }

  async validateGroupSource(groupId: number, sourceId: number) {
    const entry = await this.prisma.groupSource.findFirst({
      where: { groupId, sourceId },
    });
    if (!entry) throw new BadRequestException('Source is not linked to this group');
  }
}