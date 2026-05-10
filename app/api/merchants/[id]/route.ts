import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/merchants/[id] - Get merchant by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try finding by slug first, then by ID
    const merchant = await prisma.merchant.findFirst({
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

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(merchant);
  } catch (error) {
    console.error("Error fetching merchant:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant" },
      { status: 500 }
    );
  }
}

// PUT /api/merchants/[id] - Update merchant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: params.id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    if (merchant.wallet !== wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      addressStreet,
      addressCity,
      addressCountry,
      autoAcknowledge,
      selfDelivery,
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
      vendorType,
      pickupOnly,
      category,
      subcategory,
      latitude,
      longitude,
    } = body;

    if (vendorType !== undefined && !["restaurant", "home_cook", "retail"].includes(vendorType)) {
      return NextResponse.json({ error: "Invalid vendorType" }, { status: 400 });
    }
    if (latitude !== undefined && latitude !== null) {
      const lat = Number(latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
      }
    }
    if (longitude !== undefined && longitude !== null) {
      const lng = Number(longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
      }
    }

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

    const updated = await prisma.merchant.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(addressStreet !== undefined && { addressStreet: addressStreet || null }),
        ...(addressCity !== undefined && { addressCity: addressCity || null }),
        ...(addressCountry !== undefined && { addressCountry: addressCountry || null }),
        ...(autoAcknowledge !== undefined && { autoAcknowledge: Boolean(autoAcknowledge) }),
        ...(selfDelivery !== undefined && { selfDelivery: Boolean(selfDelivery) }),
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
        ...(vendorType !== undefined && { vendorType }),
        ...(pickupOnly !== undefined && { pickupOnly: Boolean(pickupOnly) }),
        ...(category !== undefined && { category }),
        ...(subcategory !== undefined && { subcategory }),
        ...(latitude !== undefined && { latitude: latitude === null ? null : Number(latitude) }),
        ...(longitude !== undefined && { longitude: longitude === null ? null : Number(longitude) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating merchant:", error);
    return NextResponse.json(
      { error: "Failed to update merchant" },
      { status: 500 }
    );
  }
}
