import { Injectable, Logger } from '@nestjs/common';

export interface StructuredToleranceConstraint {
  rawText: string;
  nominal: number;
  upperTol: number;
  lowerTol: number;
  minVal: number;
  maxVal: number;
  unit: string;
  isSymmetric: boolean;
  toleranceType: 'SYMMETRIC' | 'ASYMMETRIC' | 'RANGE' | 'LIMIT' | 'BASIC';
}

@Injectable()
export class EngineeringToleranceParserService {
  private readonly logger = new Logger(EngineeringToleranceParserService.name);

  /**
   * Parse numeric engineering tolerance constraints deterministically from text.
   * Rejects ambiguous or malformed expressions.
   */
  parseTolerance(text: string, defaultUnit: string = 'mm'): StructuredToleranceConstraint | null {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return null;
    }

    const clean = text.trim().replace(/\s+/g, ' ');

    // 1. Detect Unit
    let unit = defaultUnit;
    const unitMatch = clean.match(/\b(mm|inch|in|cm|m|deg|°)\b/i);
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      if (unit === '°') unit = 'deg';
      if (unit === 'in') unit = 'inch';
    }

    // 2. Symmetric Tolerance Pattern: "20.00 ± 0.05", "20.00 +/- 0.05", "20.00+-0.05"
    const symMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:±|\+\/\-|\+\-)\s*(\d+(?:\.\d+)?)/);
    if (symMatch) {
      const nominal = parseFloat(symMatch[1]);
      const tol = parseFloat(symMatch[2]);
      if (!isNaN(nominal) && !isNaN(tol) && tol >= 0) {
        const minVal = Math.round((nominal - tol) * 10000) / 10000;
        const maxVal = Math.round((nominal + tol) * 10000) / 10000;
        return {
          rawText: clean,
          nominal,
          upperTol: tol,
          lowerTol: -tol,
          minVal,
          maxVal,
          unit,
          isSymmetric: true,
          toleranceType: 'SYMMETRIC',
        };
      }
    }

    // 3. Asymmetric Tolerance Pattern: "20.00 +0.02 / -0.01", "20.00 +0.02 -0.01", "20.00^+0.02_-0.01"
    const asymMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*[\^]?\s*\+(\d+(?:\.\d+)?)\s*(?:\/|\s*)\s*\-(\d+(?:\.\d+)?)/);
    if (asymMatch) {
      const nominal = parseFloat(asymMatch[1]);
      const upper = parseFloat(asymMatch[2]);
      const lower = parseFloat(asymMatch[3]); // positive absolute magnitude in regex
      if (!isNaN(nominal) && !isNaN(upper) && !isNaN(lower)) {
        const minVal = Math.round((nominal - lower) * 10000) / 10000;
        const maxVal = Math.round((nominal + upper) * 10000) / 10000;
        return {
          rawText: clean,
          nominal,
          upperTol: upper,
          lowerTol: -lower,
          minVal,
          maxVal,
          unit,
          isSymmetric: false,
          toleranceType: 'ASYMMETRIC',
        };
      }
    }

    // 4. Numeric Range Pattern: "19.99 - 20.02 mm", "19.99 to 20.02", "19.99..20.02"
    const rangeMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:-|to|\.\.)\s*([+-]?\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (!isNaN(low) && !isNaN(high) && low <= high) {
        const nominal = Math.round(((low + high) / 2) * 10000) / 10000;
        return {
          rawText: clean,
          nominal,
          upperTol: Math.round((high - nominal) * 10000) / 10000,
          lowerTol: Math.round((low - nominal) * 10000) / 10000,
          minVal: low,
          maxVal: high,
          unit,
          isSymmetric: Math.abs(high - nominal - (nominal - low)) < 0.0001,
          toleranceType: 'RANGE',
        };
      }
    }

    // 5. Basic Dimension (No tolerance specified): "25.4 mm" or "50.0"
    const basicMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:mm|inch|cm|deg)?$/i);
    if (basicMatch) {
      const nominal = parseFloat(basicMatch[1]);
      if (!isNaN(nominal)) {
        return {
          rawText: clean,
          nominal,
          upperTol: 0,
          lowerTol: 0,
          minVal: nominal,
          maxVal: nominal,
          unit,
          isSymmetric: true,
          toleranceType: 'BASIC',
        };
      }
    }

    // Ambiguous or unsupported pattern -> safely reject rather than invent numbers
    return null;
  }

  /**
   * Check if a measured numeric value satisfies a structured tolerance constraint.
   */
  isValueWithinTolerance(value: number, constraint: StructuredToleranceConstraint): boolean {
    return value >= constraint.minVal && value <= constraint.maxVal;
  }
}
