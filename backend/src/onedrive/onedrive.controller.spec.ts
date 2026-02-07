import { Test, TestingModule } from '@nestjs/testing';
import { OneDriveController } from './onedrive.controller';

describe('OnedriveController', () => {
  let controller: OneDriveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OneDriveController],
    }).compile();

    controller = module.get<OneDriveController>(OneDriveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
