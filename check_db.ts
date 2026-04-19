import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function checkUsers() {
  const allUsers = await db.select().from(users);
  console.log('Total users in DB:', allUsers.length);
  console.log('Users:', JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

checkUsers();
