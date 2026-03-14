declare module 'better-sqlite3' {
  class Statement<BindParameters extends unknown[] = unknown[], Result = unknown> {
    get(...params: BindParameters): Result;
    all(...params: BindParameters): Result[];
    run(...params: BindParameters): unknown;
  }

  class Database {
    constructor(filename: string);
    pragma(statement: string): unknown;
    prepare<Result = unknown>(sql: string): Statement<any[], Result>;
  }

  export default Database;
}
