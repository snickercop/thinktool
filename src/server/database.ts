import * as pg from "pg";
import * as bcrypt from "bcrypt";

export type UserId = {name: string};

// We require the consumer of this module to call initialize() before doing
// anything else.
let client: pg.Client = undefined as never;

export async function initialize(
  host: string,
  username: string,
  password: string,
  port: number,
): Promise<void> {
  console.log("Database: Connecting to database at %s:%s as user %s", host, port, username);
  client = new pg.Client({host, user: username, password, database: "postgres", port});
  await client.connect();
}

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);

  if (result.rowCount !== 1) return null;

  if (await bcrypt.compare(password, result.rows[0].password)) {
    return {name: result.rows[0].name};
  } else {
    return null;
  }
}

export async function userName(userId: UserId): Promise<string | null> {
  const result = await client.query(`SELECT name FROM users WHERE name = $1`, [userId.name]);
  if (result.rowCount !== 1) return null;
  return result.rows[0].name;
}

export async function createUser(
  user: string,
  password: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"}> {
  const hashedPassword = await bcrypt.hash(password, 6);

  try {
    const row = (
      await client.query(`INSERT INTO users (name, password) VALUES ($1, $2) RETURNING name`, [
        user,
        hashedPassword,
      ])
    ).rows[0];
    return row.name;
  } catch (e) {
    return {type: "error"};
  }
}

export async function getFullState(
  userId: UserId,
): Promise<{
  things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[];
}> {
  // [TODO] Can we do all this in one transaction? Can we optimize it?

  const thingsResult = await client.query(`SELECT name, content FROM things WHERE "user" = $1`, [
    userId.name,
  ]);

  let things: {
    name: string;
    content: string;
    children: {name: string; child: string; tag?: string}[];
  }[] = [];

  for (const thing of thingsResult.rows) {
    things.push({name: thing.name, content: thing.content ?? "", children: []});
  }

  for (const thing of things) {
    const childrenResult = await client.query(
      `SELECT name, child, tag FROM connections WHERE "user" = $1 AND parent = $2 ORDER BY parent_index ASC`,
      [userId.name, thing.name],
    );
    for (const connection of childrenResult.rows) {
      thing.children.push({name: connection.name, child: connection.child, tag: connection.tag ?? undefined});
    }
  }

  return {things};
}

export async function updateThing({
  userId,
  thing,
  content,
  children,
}: {
  userId: UserId;
  thing: string;
  content: string;
  children: {name: string; child: string; tag?: string}[];
}): Promise<void> {
  // [TODO] Can we do all this in one transaction? Can we optimize it?

  await client.query(
    `INSERT INTO things ("user", name, content) VALUES ($1, $2, $3) ON CONFLICT ("user", name) DO UPDATE SET content = EXCLUDED.content`,
    [userId.name, thing, content],
  );

  // Delete old connections
  await client.query(`DELETE FROM connections WHERE "user" = $1 AND parent = $2`, [userId.name, thing]);

  // Store new connections
  for (let i = 0; i < children.length; ++i) {
    const connection = children[i];
    await client.query(
      `INSERT INTO connections ("user", name, parent, child, tag, parent_index) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId.name, connection.name, thing, connection.child, connection.tag, i],
    );
  }
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  // await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name, child: thing});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name, parent: thing});
  // await client
  //   .db("diaform")
  //   .collection("connections")
  //   .updateMany({user: userId.name, tag: thing}, {$unset: {tag: ""}});
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  await client.query(`UPDATE things SET content = $3 WHERE "user" = $1 AND name = $2`, [
    userId.name,
    thing,
    content,
  ]);
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{content: string; children: {name: string; child: string; tag?: string}[]} | null> {
  const thingResult = await client.query(`SELECT content FROM things WHERE "user" = $1 AND name = $2`, [
    userId.name,
    thing,
  ]);

  if (thingResult.rowCount !== 1) return null;
  const row = thingResult.rows[0];

  // [TODO] Get children

  return {content: row.content ?? "", children: []};
}

export async function deleteAllUserData(userId: UserId): Promise<void> {
  // await client.db("diaform").collection("users").deleteOne({name: userId.name});
  // await client.db("diaform").collection("things").deleteMany({user: userId.name});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name});
}
