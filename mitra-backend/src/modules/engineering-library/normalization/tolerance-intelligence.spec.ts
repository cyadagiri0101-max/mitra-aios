import { EngineeringToleranceParserService } from './engineering-tolerance-parser.service';

describe('EngineeringToleranceParserService (S4.4)', () => {
  let service: EngineeringToleranceParserService;

  beforeEach(() => {
    service = new EngineeringToleranceParserService();
  });

  it('should parse symmetric tolerance (±0.05 mm)', () => {
    const res = service.parseTolerance('20.00 ± 0.05 mm');
    expect(res).toBeDefined();
    expect(res?.nominal).toBe(20.0);
    expect(res?.upperTol).toBe(0.05);
    expect(res?.lowerTol).toBe(-0.05);
    expect(res?.minVal).toBe(19.95);
    expect(res?.maxVal).toBe(20.05);
    expect(res?.unit).toBe('mm');
    expect(res?.isSymmetric).toBe(true);
    expect(res?.toleranceType).toBe('SYMMETRIC');
  });

  it('should parse asymmetric tolerance (+0.02 / -0.01 mm)', () => {
    const res = service.parseTolerance('25.00 +0.02 / -0.01 mm');
    expect(res).toBeDefined();
    expect(res?.nominal).toBe(25.0);
    expect(res?.upperTol).toBe(0.02);
    expect(res?.lowerTol).toBe(-0.01);
    expect(res?.minVal).toBe(24.99);
    expect(res?.maxVal).toBe(25.02);
    expect(res?.unit).toBe('mm');
    expect(res?.isSymmetric).toBe(false);
    expect(res?.toleranceType).toBe('ASYMMETRIC');
  });

  it('should parse range tolerance (19.99 - 20.02 mm)', () => {
    const res = service.parseTolerance('19.99 - 20.02 mm');
    expect(res).toBeDefined();
    expect(res?.minVal).toBe(19.99);
    expect(res?.maxVal).toBe(20.02);
    expect(res?.nominal).toBe(20.005);
    expect(res?.toleranceType).toBe('RANGE');
  });

  it('should correctly evaluate if a measured value is within tolerance', () => {
    const constraint = service.parseTolerance('50.00 ± 0.10 mm')!;
    expect(service.isValueWithinTolerance(50.05, constraint)).toBe(true);
    expect(service.isValueWithinTolerance(49.90, constraint)).toBe(true);
    expect(service.isValueWithinTolerance(50.11, constraint)).toBe(false);
    expect(service.isValueWithinTolerance(49.89, constraint)).toBe(false);
  });

  it('should safely reject ambiguous, invalid, or malformed strings with null', () => {
    expect(service.parseTolerance('')).toBeNull();
    expect(service.parseTolerance('approximately 20mm or so')).toBeNull();
    expect(service.parseTolerance('invalid +++ tolerance')).toBeNull();
  });
});
