import { Test, TestingModule } from '@nestjs/testing';
import { PrivateChatsService } from './private-chats.service';

describe('PrivateChatsService', () => {
  let service: PrivateChatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivateChatsService],
    }).compile();

    service = module.get<PrivateChatsService>(PrivateChatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
