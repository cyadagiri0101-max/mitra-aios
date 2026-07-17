import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class NoteService extends TenantAwareService<Note> {
  constructor(
    @InjectRepository(Note)
    repo: Repository<Note>,
  ) {
    super(repo, 'Note');
  }
}