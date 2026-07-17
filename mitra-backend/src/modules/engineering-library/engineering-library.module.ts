import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EngineeringLibraryController } from './controllers/engineering-library.controller';
import { EngineeringLibraryService } from './services/engineering-library.service';

@Module({
  imports: [ConfigModule],
  controllers: [EngineeringLibraryController],
  providers: [EngineeringLibraryService],
  exports: [EngineeringLibraryService],
})
export class EngineeringLibraryModule {}
