import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DrawingAnalysis, DrawingFileType } from '../entities/drawing-analysis.entity';
import { UploadDrawingDto, DrawingAnalysisResponseDto } from '../dto/drawing-analysis.dto';
import { MinioService } from '@modules/storage/minio.service';

@Injectable()
export class DrawingAnalysisService {
  private readonly logger = new Logger(DrawingAnalysisService.name);

  constructor(
    @InjectRepository(DrawingAnalysis)
    private readonly drawingRepo: Repository<DrawingAnalysis>,
    private readonly minio: MinioService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async uploadAndAnalyze(dto: UploadDrawingDto, tenantId?: string | null): Promise<DrawingAnalysisResponseDto> {
    const scopeTenant = this.requireTenant(tenantId);
    const t0 = Date.now();

    // Decode base64 and validate size
    const buffer = Buffer.from(dto.fileContentBase64, 'base64');
    if (buffer.length > 25 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 25 MB limit');
    }

    const mimeType = this.mapFileTypeToMime(dto.fileType);
    const uploadResult = await this.minio.uploadFile(
      buffer,
      dto.fileName,
      mimeType,
      'mitra-design',
      `drawings/${dto.projectId}`,
    );

    // Generate presigned URL for retrieval
    const presigned = await this.minio.generatePresignedGetUrl(
      uploadResult.bucket,
      uploadResult.key,
      86400,
    );

    // Simulate AI analysis
    const analysisResult = this.simulateAnalysis(dto.fileType, buffer.length);

    const entity = this.drawingRepo.create({
      projectId: dto.projectId,
      tenantId: scopeTenant,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileUrl: presigned.url,
      partComplexity: analysisResult.partComplexity,
      suggestedMachiningTime: analysisResult.suggestedMachiningTime,
      riskAreas: analysisResult.riskAreas,
      confidence: analysisResult.confidence,
      extractedFeatures: analysisResult.extractedFeatures,
    });

    const saved = await this.drawingRepo.save(entity);

    this.logger.log(
      `Drawing analysis completed in ${Date.now() - t0}ms for ${dto.fileName}`,
    );

    return this.mapToResponse(saved);
  }

  async getAnalysis(id: string, tenantId?: string | null): Promise<DrawingAnalysisResponseDto> {
    const scopeTenant = this.requireTenant(tenantId);
    const analysis = await this.drawingRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!analysis) throw new NotFoundException(`Drawing Analysis ${id} not found`);
    return this.mapToResponse(analysis);
  }

  async getProjectAnalyses(projectId: string, tenantId?: string | null): Promise<DrawingAnalysisResponseDto[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const analyses = await this.drawingRepo.find({ where: { projectId, deletedAt: IsNull(), tenantId: scopeTenant }, order: { createdAt: 'DESC' } });
    return analyses.map((a) => this.mapToResponse(a));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private mapFileTypeToMime(fileType: DrawingFileType): string {
    const map: Record<DrawingFileType, string> = {
      [DrawingFileType.STEP]: 'application/step',
      [DrawingFileType.IGES]: 'model/iges',
      [DrawingFileType.PDF]: 'application/pdf',
      [DrawingFileType.DWG]: 'application/acad',
    };
    return map[fileType] ?? 'application/octet-stream';
  }

  private simulateAnalysis(fileType: DrawingFileType, fileSizeBytes: number): {
    partComplexity: string;
    suggestedMachiningTime: number;
    riskAreas: Record<string, any>[];
    confidence: number;
    extractedFeatures: Record<string, any>[];
  } {
    // Simple heuristic simulation based on file size and type
    const sizeFactor = Math.min(fileSizeBytes / (1024 * 1024), 50); // MB cap at 50
    const complexityScore = sizeFactor * (fileType === DrawingFileType.STEP ? 1.2 : 1.0);

    let partComplexity: string;
    if (complexityScore > 30) partComplexity = 'High';
    else if (complexityScore > 10) partComplexity = 'Medium';
    else partComplexity = 'Low';

    const suggestedMachiningTime = Math.round(complexityScore * 2.5 * 10) / 10;

    const riskAreas: Record<string, any>[] = [];
    if (fileType === DrawingFileType.DWG) {
      riskAreas.push({ type: 'FORMAT_COMPATIBILITY', severity: 'medium', message: 'DWG may require conversion for CAM systems' });
    }
    if (complexityScore > 25) {
      riskAreas.push({ type: 'HIGH_COMPLEXITY', severity: 'high', message: 'High part complexity may require 5-axis machining' });
    }
    if (fileSizeBytes < 1024) {
      riskAreas.push({ type: 'LOW_DETAIL', severity: 'low', message: 'File size suggests low geometric detail; verify completeness' });
    }

    const confidence = Math.min(0.92, 0.65 + sizeFactor * 0.005);

    const extractedFeatures: Record<string, any>[] = [
      { type: 'GEOMETRY', description: 'External contours detected', count: Math.floor(complexityScore / 2) },
      { type: 'HOLES', description: 'Through holes', count: Math.floor(complexityScore / 3) },
      { type: 'POCKETS', description: 'Pocket features', count: Math.floor(complexityScore / 5) },
    ];

    return {
      partComplexity,
      suggestedMachiningTime,
      riskAreas,
      confidence,
      extractedFeatures,
    };
  }

  private mapToResponse(analysis: DrawingAnalysis): DrawingAnalysisResponseDto {
    return {
      id: analysis.id,
      projectId: analysis.projectId,
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      fileUrl: analysis.fileUrl,
      partComplexity: analysis.partComplexity ?? undefined,
      suggestedMachiningTime: analysis.suggestedMachiningTime ?? undefined,
      riskAreas: analysis.riskAreas ?? undefined,
      confidence: analysis.confidence ?? undefined,
      extractedFeatures: analysis.extractedFeatures ?? undefined,
      createdAt: analysis.createdAt,
    };
  }
}
