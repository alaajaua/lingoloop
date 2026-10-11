import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
config({ quiet: true });
const [action, email] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action ?? "") || !email)
  throw new Error("Usage: npm run admin:role -- grant|revoke existing-email");
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1"].includes(url.hostname)
)
  throw new Error("This tool is restricted to the local development database");
const db = new PrismaClient();
async function main() {
  try {
    const user = await db.user.update({
      where: { email: email!.trim().toLowerCase() },
      data: { role: action === "grant" ? "admin" : "learner" },
      select: { id: true, role: true },
    });
    console.log(`User ${user.id}: ${user.role}`);
  } finally {
    await db.$disconnect();
  }
}
void main();
