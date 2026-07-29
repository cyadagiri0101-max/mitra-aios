# DTO Specifications

## Purpose

This document defines the Data Transfer Objects (DTOs) for all MITRA API endpoints. These serve as the single source of truth for request validation and response serialization.

---

## Commercial DTOs

### CreateCustomerDto
```typescript
// POST /api/v1/commercial/customers
export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts?: CreateContactDto[];
}
```

### CreateContactDto
```typescript
export class CreateContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
```

### CreateRfqDto
```typescript
// POST /api/v1/commercial/rfqs
export class CreateRfqDto {
  @IsUUID()
  customer_id: string;

  @IsObject()
  specifications: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachments?: string[];
}
```

### CreateQuotationDto
```typescript
// POST /api/v1/commercial/quotations
export class CreateQuotationDto {
  @IsUUID()
  rfq_id: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsObject()
  terms: Record<string, unknown>;

  @IsDateString()
  valid_until: string;
}

// POST /api/v1/commercial/quotations/{id}/accept
export class AcceptQuotationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  project_name: string;
}

// POST /api/v1/commercial/quotations/{id}/reject
export class RejectQuotationDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
```

### CustomerResponseDto
```typescript
export class CustomerResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  industry: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => ContactResponseDto)
  contacts: ContactResponseDto[];

  @Expose()
  created_at: string;
}
```

---

## Project DTOs

### CreateProjectDto
```typescript
// POST /api/v1/project/projects
export class CreateProjectDto {
  @IsUUID()
  quotation_id: string;

  @IsUUID()
  customer_id: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  delivery_date: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: string;
}
```

### CreateMilestoneDto
```typescript
// POST /api/v1/project/projects/{id}/milestones
export class CreateMilestoneDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(1)
  sequence: number;

  @IsDateString()
  target_date: string;
}
```

### CreateTaskDto
```typescript
// POST /api/v1/project/projects/{id}/tasks
export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  milestone_id?: string;

  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}
```

### TransitionDto
```typescript
// POST /api/v1/project/projects/{id}/transition
// POST /api/v1/project/tasks/{id}/transition
export class TransitionDto {
  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

### ProjectQueryDto
```typescript
// GET /api/v1/project/projects
export class ProjectQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = 'created_at:desc';
}
```

---

## Engineering DTOs

### CreateDesignDto
```typescript
// POST /api/v1/engineering/designs
export class CreateDesignDto {
  @IsUUID()
  project_id: string;
}
```

### UploadCadFileDto
```typescript
// POST /api/v1/engineering/designs/{id}/upload (multipart/form-data)
export class UploadCadFileDto {
  @IsFile({ mime: ['application/step', 'application/x-step', ...] })
  @MaxFileSize(500 * 1024 * 1024) // 500MB
  file: Express.Multer.File;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
```

### CreateBomDto
```typescript
// POST /api/v1/engineering/boms
export class CreateBomDto {
  @IsUUID()
  project_id: string;

  @IsOptional()
  @IsUUID()
  design_id?: string;
}
```

### CreateBomItemDto
```typescript
// POST /api/v1/engineering/boms/{id}/items
export class CreateBomItemDto {
  @IsOptional()
  @IsUUID()
  parent_item_id?: string;

  @IsString()
  @MaxLength(100)
  part_number: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @MaxLength(20)
  unit: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string;

  @IsOptional()
  @IsObject()
  specification?: Record<string, unknown>;
}
```

### CreateEngineeringChangeDto
```typescript
// POST /api/v1/engineering/engineering-changes
export class CreateEngineeringChangeDto {
  @IsUUID()
  project_id: string;

  @IsString()
  @MaxLength(1000)
  reason: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AffectedEntityDto)
  affected_entities: AffectedEntityDto[];
}

export class AffectedEntityDto {
  @IsString()
  type: string;

  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### CreateProcessPlanDto
```typescript
// POST /api/v1/engineering/process-plans
export class CreateProcessPlanDto {
  @IsUUID()
  project_id: string;

  @IsOptional()
  @IsUUID()
  bom_id?: string;
}

export class CreateProcessOperationDto {
  @IsInt()
  @Min(1)
  sequence: number;

  @IsString()
  @MaxLength(200)
  operation_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  machine_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimated_time?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
```

---

## Manufacturing DTOs

### CreateWorkOrderDto
```typescript
// POST /api/v1/manufacturing/work-orders
export class CreateWorkOrderDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  production_plan_id: string;

  @IsUUID()
  bom_item_id: string;

  @IsUUID()
  machine_id: string;

  @IsInt()
  @Min(1)
  quantity_planned: number;

  @IsDateString()
  scheduled_start: string;

  @IsDateString()
  scheduled_end: string;

  @IsOptional()
  @IsUUID()
  assigned_operator?: string;
}
```

### RecordProductionRunDto
```typescript
// POST /api/v1/manufacturing/work-orders/{id}/runs
export class RecordProductionRunDto {
  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsInt()
  @Min(0)
  quantity_produced: number;

  @IsInt()
  @Min(0)
  quantity_scrapped: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### ScheduleTrialDto
```typescript
// POST /api/v1/manufacturing/trials
export class ScheduleTrialDto {
  @IsUUID()
  project_id: string;

  @IsDateString()
  trial_date: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

---

## Quality DTOs

### CreateInspectionPlanDto
```typescript
// POST /api/v1/quality/inspection-plans
export class CreateInspectionPlanDto {
  @IsUUID()
  project_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckpointDto)
  checkpoints: CheckpointDto[];
}

export class CheckpointDto {
  @IsInt()
  @Min(1)
  sequence: number;

  @IsString()
  parameter: string;

  @IsString()
  tolerance: string;

  @IsString()
  method: string;
}
```

### RecordInspectionResultDto
```typescript
// POST /api/v1/quality/inspection-results
export class RecordInspectionResultDto {
  @IsUUID()
  inspection_plan_id: string;

  @IsUUID()
  work_order_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasurementDto)
  measurements: MeasurementDto[];

  @IsUUID()
  inspector_id: string;
}

export class MeasurementDto {
  @IsInt()
  checkpoint: number;

  @IsString()
  measured_value: string;

  @IsBoolean()
  pass: boolean;
}
```

### CreateNcrDto
```typescript
// POST /api/v1/quality/ncrs
export class CreateNcrDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  inspection_result_id: string;

  @IsString()
  @MaxLength(100)
  defect_type: string;

  @IsEnum(['minor', 'major', 'critical'])
  severity: string;

  @IsString()
  @MaxLength(2000)
  description: string;
}
```

### InitiateCapaDto
```typescript
// POST /api/v1/quality/capas
export class InitiateCapaDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  ncr_id: string;

  @IsString()
  @MaxLength(2000)
  root_cause: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCapaActionDto)
  corrective_actions?: CreateCapaActionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCapaActionDto)
  preventive_actions?: CreateCapaActionDto[];
}

export class CreateCapaActionDto {
  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}
```

---

## Service DTOs

### CreateDispatchDto
```typescript
// POST /api/v1/service/dispatch
export class CreateDispatchDto {
  @IsUUID()
  project_id: string;

  @IsDateString()
  dispatch_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;
}
```

### CreateServiceRequestDto
```typescript
// POST /api/v1/service/service-requests
export class CreateServiceRequestDto {
  @IsUUID()
  project_id: string;

  @IsString()
  @MaxLength(2000)
  issue: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;
}
```

---

## Security DTOs

### LoginDto
```typescript
// POST /api/v1/auth/login
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class LoginResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  refresh_token: string;

  @Expose()
  expires_in: number;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
```

### RefreshTokenDto
```typescript
// POST /api/v1/auth/refresh
export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  display_name: string;

  @Expose()
  @Type(() => UserRoleDto)
  roles: UserRoleDto[];
}

export class UserRoleDto {
  @Expose()
  name: string;

  @Expose()
  scope: string | null;

  @Expose()
  project_id: string | null;
}
```

---

## Common / Shared DTOs

```typescript
// Wrapper for all list queries
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// Standard API response wrapper
export class ApiResponseDto<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
}

// Standard error response
export class ApiErrorDto {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string; code: string }[];
    requestId: string;
    timestamp: string;
  };
}
```
