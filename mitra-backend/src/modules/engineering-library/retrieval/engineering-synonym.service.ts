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
