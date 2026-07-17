import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Attachment } from './entities/attachment.entity';
import { Comment } from './entities/comment.entity';
import { ActivityLog } from './entities/activitylog.entity';
import { CustomField } from './entities/customfield.entity';
import { CustomFieldValue } from './entities/customfieldvalue.entity';
import { NoteService } from './services/note.service';
import { NoteController } from './controllers/note.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Attachment, Comment, ActivityLog, CustomField, CustomFieldValue])],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService, TypeOrmModule],
})
export class CollaborationModule {}
