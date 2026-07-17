import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService, MOLD_ALLOWED_TRANSITIONS, MoldProjectStage } from './workflow.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkflowState } from '../entities/workflow-state.entity';
import { WorkflowTransition } from '../entities/workflow-transition.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';

const makeRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
});

// ── State machine correctness ─────────────────────────────────────────────────
describe('MOLD_ALLOWED_TRANSITIONS', () => {
  it('has exactly 17 lifecycle stages', () => {
    expect(Object.keys(MOLD_ALLOWED_TRANSITIONS)).toHaveLength(17);
  });

  it('ENQUIRY → QUOTATION is valid', () => {
    expect(MOLD_ALLOWED_TRANSITIONS[MoldProjectStage.ENQUIRY]).toContain(MoldProjectStage.QUOTATION);
  });

  it('ENQUIRY → MANUFACTURING is invalid (stage skipping)', () => {
    expect(MOLD_ALLOWED_TRANSITIONS[MoldProjectStage.ENQUIRY]).not.toContain(MoldProjectStage.MANUFACTURING);
  });

  it('SERVICE is the terminal state (no outgoing transitions)', () => {
    expect(MOLD_ALLOWED_TRANSITIONS[MoldProjectStage.SERVICE]).toHaveLength(0);
  });

  it('follows the correct linear sequence through the entire lifecycle', () => {
    const expectedSequence = [
      MoldProjectStage.ENQUIRY,
      MoldProjectStage.QUOTATION,
      MoldProjectStage.APPROVAL,
      MoldProjectStage.PROJECT_CREATED,
      MoldProjectStage.DESIGN_INITIATED,
      MoldProjectStage.CPS_APPROVED,
      MoldProjectStage.DESIGN_RELEASED,
      MoldProjectStage.PROCESS_PLANNING,
      MoldProjectStage.MACHINE_PLANNING,
      MoldProjectStage.MANUFACTURING,
      MoldProjectStage.INTERNAL_TRIAL,
      MoldProjectStage.CUSTOMER_TRIAL,
      MoldProjectStage.CAPA,
      MoldProjectStage.RETRIAL,
      MoldProjectStage.CUSTOMER_APPROVAL,
      MoldProjectStage.DISPATCH,
      MoldProjectStage.SERVICE,
    ];

    // Walk the chain and confirm each stage leads to the next
    for (let i = 0; i < expectedSequence.length - 1; i++) {
      const from = expectedSequence[i];
      const to = expectedSequence[i + 1];
      expect(MOLD_ALLOWED_TRANSITIONS[from]).toContain(to);
    }
  });

  it('every stage entry exists in MoldProjectStage enum', () => {
    const enumValues = Object.values(MoldProjectStage) as string[];
    for (const stage of Object.keys(MOLD_ALLOWED_TRANSITIONS)) {
      expect(enumValues).toContain(stage);
    }
  });

  it('every transition target exists in MoldProjectStage enum', () => {
    const enumValues = Object.values(MoldProjectStage) as string[];
    for (const targets of Object.values(MOLD_ALLOWED_TRANSITIONS)) {
      for (const target of targets) {
        expect(enumValues).toContain(target);
      }
    }
  });
});

// ── WorkflowService wiring ────────────────────────────────────────────────────
describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(WorkflowState), useValue: makeRepo() },
        { provide: getRepositoryToken(WorkflowTransition), useValue: makeRepo() },
        { provide: getRepositoryToken(WorkflowInstance), useValue: makeRepo() },
      ],
    }).compile();
    service = module.get<WorkflowService>(WorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
