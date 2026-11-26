// Creates the tables. Safe to run more than once.
import { connect, migrate } from "../src/lib/db/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL first");
const sql = connect(url);
await migrate(sql);
await sql.end();
console.log("✓ database ready");
