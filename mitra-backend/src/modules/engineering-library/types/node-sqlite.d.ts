declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    all(...params: any[]): Record<string, any>[];
    get(...params: any[]): Record<string, any> | undefined;
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  }
}
