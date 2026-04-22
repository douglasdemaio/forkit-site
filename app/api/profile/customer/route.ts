import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/profile/customer — authenticated customer profile
export async function GET(request: NextRequest) {
  const wallet = await getWalletFromRequest(request);
  if (!wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await prisma.customerProfile.upsert({
      where: { wallet },
      update: {},
      create: { wallet },
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return NextResponse.json({ error: "Failed to fetch customer profile" }, { status: 500 });
  }
}

// PATCH /api/profile/customer — update preferEco
export async function PATCH(request: NextRequest) {
  const wallet = await getWalletFromRequest(request);
  if (!wallet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { preferEco } = await request.json();
    if (typeof preferEco !== "boolean") {
      return NextResponse.json({ error: "preferEco must be a boolean" }, { status: 400 });
    }

    const profile = await prisma.customerProfile.upsert({
      where: { wallet },
      update: { preferEco },
      create: { wallet, preferEco },
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating customer profile:", error);
    return NextResponse.json({ error: "Failed to update customer profile" }, { status: 500 });
  }
}
