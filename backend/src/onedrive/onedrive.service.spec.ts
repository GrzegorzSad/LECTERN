import { Test, TestingModule } from '@nestjs/testing';
import { OneDriveService } from './onedrive.service';

describe('OneDriveService', () => {
  let service: OneDriveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OneDriveService],
    }).compile();

    service = module.get<OneDriveService>(OneDriveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
