import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(name: string, creatorUserId: number, img?: string) {
  return this.prisma.$transaction(async (prisma) => {
    const group = await prisma.group.create({
      data: {
        name,
        img: img || null,
      },
    })

    await prisma.member.create({
      data: {
        groupId: group.id,
        userId: creatorUserId,
        role: 'ADMIN',
      },
    })

    return group
  })
}

  async getGroups() {
    return this.prisma.group.findMany()
  }

  async getGroupById(id: number) {
    return this.prisma.group.findUnique({ where: { id } })
  }

  async updateGroup(id: number, name?: string, img?: string) {
    return this.prisma.group.update({
      where: { id },
      data: {
        name: name || undefined,
        img: img || undefined,
      },
    })
  }

  async deleteGroup(id: number) {
    // Optionally cascade delete files/chunks if needed
    return this.prisma.group.delete({ where: { id } })
  }
}
