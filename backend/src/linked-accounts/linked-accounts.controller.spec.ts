import { Test, TestingModule } from '@nestjs/testing';
import { LinkedAccountsController } from './linked-accounts.controller';

describe('LinkedAccountsController', () => {
  let controller: LinkedAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkedAccountsController],
    }).compile();

    controller = module.get<LinkedAccountsController>(LinkedAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
