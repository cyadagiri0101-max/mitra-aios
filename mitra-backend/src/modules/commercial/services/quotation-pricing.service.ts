import { Injectable } from '@nestjs/common';

export interface PricedItem {
  lineNumber: number;
  itemCode: string | null;
  description: string;
  itemCategory: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimatedCost: number;
  sellingPrice: number;
  marginAmount: number;
  marginPct: number;
  discountPct: number;
  lineTotal: number;
  leadTimeWeeks: number | null;
  hsnCode: string | null;
  remarks: string | null;
}

export interface RepriceResult {
  items: PricedItem[];
  subtotal: number;
  estimatedCost: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  marginAmount: number;
  marginPct: number;
}

@Injectable()
export class QuotationPricingService {
  computeDiscountAmount(
    items: Array<Partial<PricedItem>> | undefined,
    discountPct: number,
  ): number {
    if (!items?.length || discountPct <= 0) return 0;
    let rawSubtotal = 0;
    for (const raw of items) {
      const quantity = Number(raw.quantity ?? 1);
      const unitPrice = Number(raw.unitPrice ?? raw.sellingPrice ?? 0);
      const itemDiscountPct = Number(raw.discountPct ?? 0);
      rawSubtotal += quantity * unitPrice * (1 - itemDiscountPct / 100);
    }
    return Math.round(rawSubtotal * (discountPct / 100) * 100) / 100;
  }

  priceItems(
    items: Array<Partial<PricedItem>>,
    discountPct = 0,
  ): { items: PricedItem[]; subtotal: number; estimatedCost: number } {
    let subtotal = 0;
    let estimatedCost = 0;
    const priced = items.map((raw, idx) => {
      const lineNumber = raw.lineNumber ?? idx + 1;
      const quantity = Number(raw.quantity ?? 1);
      const unitPrice = Number(raw.unitPrice ?? raw.sellingPrice ?? 0);
      const itemEstimatedCost = Number(raw.estimatedCost ?? 0);
      const itemDiscountPct = Number(raw.discountPct ?? 0);

      const lineSubtotal = quantity * unitPrice * (1 - itemDiscountPct / 100);
      const lineCost = quantity * itemEstimatedCost;
      const marginAmount = lineSubtotal - lineCost;
      const marginPct = lineSubtotal > 0 ? (marginAmount / lineSubtotal) * 100 : 0;

      subtotal += lineSubtotal;
      estimatedCost += lineCost;

      return {
        lineNumber,
        itemCode: raw.itemCode ?? null,
        description: raw.description ?? '',
        itemCategory: raw.itemCategory ?? null,
        quantity,
        unit: raw.unit ?? 'NOS',
        unitPrice,
        estimatedCost: itemEstimatedCost,
        sellingPrice: unitPrice,
        marginAmount: Math.round(marginAmount * 100) / 100,
        marginPct: Math.round(marginPct * 100) / 100,
        discountPct: itemDiscountPct,
        lineTotal: Math.round(lineSubtotal * 100) / 100,
        leadTimeWeeks: raw.leadTimeWeeks ?? null,
        hsnCode: raw.hsnCode ?? null,
        remarks: raw.remarks ?? null,
      };
    });

    // Apply quotation-level discount on the aggregate subtotal
    let finalSubtotal = subtotal;
    if (discountPct > 0) {
      finalSubtotal = subtotal * (1 - discountPct / 100);
    }

    return {
      items: priced,
      subtotal: Math.round(finalSubtotal * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }

  reprice(
    items: Array<Partial<PricedItem>>,
    discountPct: number,
    taxPct: number,
  ): RepriceResult {
    const pricing = this.priceItems(items, discountPct);
    const discountAmount = this.computeDiscountAmount(items, discountPct);
    const taxAmount = pricing.subtotal * (taxPct / 100);
    const totalAmount = pricing.subtotal + taxAmount;
    const marginAmount = pricing.subtotal - pricing.estimatedCost;
    const marginPct = pricing.subtotal > 0 ? (marginAmount / pricing.subtotal) * 100 : 0;

    return {
      items: pricing.items,
      subtotal: pricing.subtotal,
      estimatedCost: pricing.estimatedCost,
      discountAmount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      marginPct: Math.round(marginPct * 100) / 100,
    };
  }
}
