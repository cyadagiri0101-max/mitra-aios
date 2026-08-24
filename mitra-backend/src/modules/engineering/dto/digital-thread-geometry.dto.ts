import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class RegisterGeometryAssetDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  componentId: string;

  @IsString()
  @IsNotEmpty()
  componentCode: string;

  @IsString()
  @IsNotEmpty()
  componentName: string;

  @IsString()
  @IsOptional()
  revisionCode?: string;

  @IsString()
  @IsOptional()
  deliverableId?: string;

  @IsString()
  @IsNotEmpty()
  sourceFileName: string;

  @IsString()
  @IsNotEmpty()
  sourceFilePath: string;

  @IsString()
  @IsNotEmpty()
  sourceFileHash: string;

  @IsString()
  @IsOptional()
  cadFormat?: string;

  @IsString()
  @IsOptional()
  meshUrl?: string;

  @IsString()
  @IsOptional()
  responsibleEngineerId?: string;

  @IsOptional()
  boundingBox?: any;
}

export class PerformGovernedMeasurementDto {
  @IsString()
  @IsNotEmpty()
  geometryAssetId: string;

  @IsString()
  @IsNotEmpty()
  measurementType: 'POINT_TO_POINT' | 'FACE_NORMAL_DISTANCE' | 'DIAMETER' | 'BOUNDING_BOX';

  @IsArray()
  pointA: [number, number, number];

  @IsArray()
  @IsOptional()
  pointB?: [number, number, number];

  @IsString()
  @IsOptional()
  unit?: string;
}

export class Query3dCopilotDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  componentId?: string;

  @IsString()
  @IsOptional()
  geometryAssetId?: string;
}
