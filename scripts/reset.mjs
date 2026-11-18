import { reset, database } from "../tests/helpers.js";
if (process.argv[2] !== "--trial1")
  throw new Error("Specify --trial1 for the dedicated local test database.");
await reset();
console.log(
  await database(
    "SELECT (SELECT COUNT(*) FROM members) AS members, (SELECT COUNT(*) FROM posts) AS posts",
  ),
);
