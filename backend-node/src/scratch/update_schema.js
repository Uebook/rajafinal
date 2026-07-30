import fs from 'fs';

let schemaContent = fs.readFileSync('drizzle/schema.ts', 'utf8');

// Add crypto import at the top
schemaContent = 'import crypto from "crypto";\n' + schemaContent;

// Replace id definition with client-side UUID default function
schemaContent = schemaContent.replaceAll(
  'id: uuid("id").primaryKey().notNull(),',
  'id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),'
);

fs.writeFileSync('src/db/schema.ts', schemaContent, 'utf8');
console.log('SUCCESSFULLY GENERATED src/db/schema.ts!');
