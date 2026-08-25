import { Injectable } from '@nestjs/common';

@Injectable()
export class EngineeringSynonymService {
  private readonly synonymMap: Map<string, string[]> = new Map([
    ['bom', ['bill of materials', 'bill of material', 'part list', 'partlist', 'components']],
    ['part list', ['bom', 'bill of materials', 'partlist']],
    ['cycle time', ['cycle-time', 'cycletime', 'ct', 'cycle seconds', 'cycle_time']],
    ['ct', ['cycle time', 'cycle-time', 'cycletime']],
    ['cavity', ['cavitation', 'cavities', 'cav']],
    ['cavitation', ['cavity', 'cavities', 'cav']],
    ['mold', ['mould', 'tooling', 'tool']],
    ['mould', ['mold', 'tooling', 'tool']],
    ['tooling', ['mold', 'mould', 'tool']],
    ['insert', ['body insert', 'core insert', 'cavity insert', 'neck insert']],
    ['resin', ['polymer', 'plastic', 'raw material']],
    ['hdpe', ['high density polyethylene', 'blow grade hdpe']],
    ['pp', ['polypropylene', 'pp homopolymer', 'pp copolymer']],
    ['pet', ['polyethylene terephthalate']],
    ['roughing', ['cnc roughing', 'rough machining', 'milling']],
    ['finishing', ['cnc finishing', 'final machining', 'vmc finishing']],
    ['edm', ['sparking', 'electric discharge machining', 'wirecut']],
    ['hardness', ['hrc', 'hb', 'heat treatment hardness']],
    ['tonnage', ['clamping force', 'clamp force', 'ton']],
    ['p20', ['1.2311', '1.2738', 'aisi p20', 'din 1.2311', 'jis fld-1', 'p20 steel']],
    ['1.2311', ['p20', 'din 1.2311', 'aisi p20']],
    ['h13', ['1.2344', 'din 1.2344', 'skd61', 'aisi h13']],
    ['1.2344', ['h13', 'din 1.2344', 'skd61']],
    ['1.2083', ['420 ss', 'sus420j2', 'din 1.2083', 'aisi 420']],
    ['en8', ['080m40', 'c45', '1.0503', 'aisi 1045']],
    ['drawing', ['2d drawing', 'cad drawing', 'zeichnung', 'blueprint', 'dwg', 'dxf']],
    ['tolerance', ['toleranz', 'limit', 'fit', 'clearance', 'allowance']],
    ['draft angle', ['entformungsschraege', 'draft', 'taper']],
    ['wall thickness', ['wandstaerke', 'thickness', 'wall']],
  ]);


  /**
   * Expand tokens in query with domain synonyms.
   */
  expandQueryTerms(tokens: string[]): string[] {
    const expanded = new Set<string>(tokens.map((t) => t.toLowerCase()));
    const fullQuery = tokens.join(' ').toLowerCase();

    // Check multi-word synonyms
    for (const [phrase, syns] of this.synonymMap.entries()) {
      if (fullQuery.includes(phrase)) {
        for (const s of syns) {
          expanded.add(s);
        }
      }
    }

    // Check single token synonyms
    for (const token of tokens) {
      const t = token.toLowerCase();
      const syns = this.synonymMap.get(t);
      if (syns) {
        for (const s of syns) {
          expanded.add(s);
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Get synonyms for a specific engineering term.
   */
  getSynonyms(term: string): string[] {
    return this.synonymMap.get(term.toLowerCase()) || [];
  }
}
