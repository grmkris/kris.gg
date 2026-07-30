import { describe, expect, it } from "bun:test";
import { assertNoTransaction } from "./client";

/**
 * D1's REST endpoint is stateless, so drizzle's sqlite-proxy transaction
 * support (which emits BEGIN/COMMIT as separate HTTP calls) would apply partial
 * writes instead of failing. This guard is the only thing standing between a
 * future `db.transaction(...)` and silent corruption, so it is worth a test.
 */
describe("assertNoTransaction", () => {
  it("allows ordinary statements", () => {
    expect(() => assertNoTransaction("select 1")).not.toThrow();
    expect(() =>
      assertNoTransaction("insert into stash_item (id) values (?)")
    ).not.toThrow();
    // "begin" appearing as a value, not as the statement, must still pass.
    expect(() =>
      assertNoTransaction("select * from t where body = 'begin'")
    ).not.toThrow();
  });

  it.each([
    "begin",
    "BEGIN DEFERRED",
    "commit",
    "ROLLBACK",
    "savepoint sp1",
    "release savepoint sp1",
  ])("rejects %s", (sql) => {
    expect(() => assertNoTransaction(sql)).toThrow(/does not support transactions/);
  });

  it("ignores leading whitespace", () => {
    expect(() => assertNoTransaction("   begin")).toThrow();
  });
});
