import session from "express-session";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaSessionStore extends session.Store {
  constructor(private prisma: PrismaService) {
    super();
  }

  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const record = await this.prisma.session.findUnique({ where: { sid } });
      if (!record) return callback(null, null);
      const sess = JSON.parse(record.data);
      callback(null, sess);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sessionData: any, callback?: (err?: any) => void) {
    try {
      const data = JSON.stringify(sessionData);
      const expires = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 1000 * 60 * 60); // default 1 hour
      await this.prisma.session.upsert({
        where: { sid },
        update: { data, expires },
        create: { sid, data, expires },
      });
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await this.prisma.session.delete({ where: { sid } });
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
