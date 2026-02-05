import { Test, TestingModule } from '@nestjs/testing';
import { LinkedAccountsService } from './linked-accounts.service';

describe('LinkedAccountsService', () => {
  let service: LinkedAccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedAccountsService],
    }).compile();

    service = module.get<LinkedAccountsService>(LinkedAccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
