import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/restaurants/[id] - Get restaurant by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try finding by slug first, then by ID
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        menuItems: {
          where: { available: true },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

// PUT /api/restaurants/[id] - Update restaurant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: params.id },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (restaurant.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      template,
      logo,
      banner,
      currency,
      deliveryFee,
      published,
      payoutWallet,
      colorPrimary,
      colorSecondary,
      colorAccent,
      fontFamily,
    } = body;

    // Validate hex colors if provided
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    for (const [name, val] of [
      ["colorPrimary", colorPrimary],
      ["colorSecondary", colorSecondary],
      ["colorAccent", colorAccent],
    ]) {
      if (val !== undefined && val !== null && val !== "" && !hexRegex.test(val as string)) {
        return NextResponse.json(
          { error: `Invalid hex color for ${name}` },
          { status: 400 }
        );
      }
    }

    // Validate Solana address if provided
    if (payoutWallet !== undefined && payoutWallet !== null && payoutWallet !== "") {
      // Basic Solana base58 address validation (32-44 chars, base58 charset)
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!base58Regex.test(payoutWallet)) {
        return NextResponse.json(
          { error: "Invalid Solana wallet address" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(template !== undefined && { template }),
        ...(logo !== undefined && { logo }),
        ...(banner !== undefined && { banner }),
        ...(currency !== undefined && { currency }),
        ...(deliveryFee !== undefined && { deliveryFee: parseFloat(deliveryFee) }),
        ...(published !== undefined && { published }),
        ...(payoutWallet !== undefined && { payoutWallet: payoutWallet || null }),
        ...(colorPrimary !== undefined && { colorPrimary: colorPrimary || null }),
        ...(colorSecondary !== undefined && { colorSecondary: colorSecondary || null }),
        ...(colorAccent !== undefined && { colorAccent: colorAccent || null }),
        ...(fontFamily !== undefined && { fontFamily: fontFamily || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { error: "Failed to update restaurant" },
      { status: 500 }
    );
  }
}
