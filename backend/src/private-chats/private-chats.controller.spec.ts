import { Test, TestingModule } from '@nestjs/testing';
import { PrivateChatsController } from './private-chats.controller';

describe('PrivateChatsController', () => {
  let controller: PrivateChatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivateChatsController],
    }).compile();

    controller = module.get<PrivateChatsController>(PrivateChatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
