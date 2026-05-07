import { NextResponse } from "next/server";

export async function GET() {
  const present = (v: string | undefined) =>
    typeof v === "string" && v.length > 0;
  return NextResponse.json({
    DATABASE_URL: present(process.env.DATABASE_URL),
    DIRECT_URL: present(process.env.DIRECT_URL),
    JWT_SECRET: present(process.env.JWT_SECRET),
    BLOB_READ_WRITE_TOKEN: present(process.env.BLOB_READ_WRITE_TOKEN),
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? null,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? null,
    DATABASE_URL_protocol:
      process.env.DATABASE_URL?.split("://")[0] ?? null,
  });
}
