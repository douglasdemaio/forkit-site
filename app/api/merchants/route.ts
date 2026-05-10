import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getWalletFromRequest } from "@/lib/auth";

// GET /api/merchants - List all published merchants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const where = {
      published: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { menuItems: true } },
        },
      }),
      prisma.merchant.count({ where }),
    ]);

    return NextResponse.json({
      merchants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing merchants:", error);
    return NextResponse.json(
      { error: "Failed to list merchants" },
      { status: 500 }
    );
  }
}

// POST /api/merchants - Create a new merchant
export async function POST(request: NextRequest) {
  try {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // A wallet can own multiple merchants

    const body = await request.json();
    const {
      name,
      description,
      addressStreet,
      addressCity,
      addressCountry,
      template,
      currency,
      vendorType,
      pickupOnly,
      category,
      subcategory,
      latitude,
      longitude,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Merchant name is required" },
        { status: 400 }
      );
    }

    if (vendorType !== undefined && !["restaurant", "home_cook", "retail"].includes(vendorType)) {
      return NextResponse.json({ error: "Invalid vendorType" }, { status: 400 });
    }

    // Generate slug from name
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure unique slug
    const slugExists = await prisma.merchant.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const merchant = await prisma.merchant.create({
      data: {
        wallet,
        name: name.trim(),
        slug,
        description: description?.trim() || "",
        addressStreet: addressStreet?.trim() || null,
        addressCity: addressCity?.trim() || null,
        addressCountry: addressCountry?.trim() || null,
        template: template || "classic-bistro",
        currency: currency || "USDC",
        ...(vendorType && { vendorType }),
        ...(pickupOnly !== undefined && { pickupOnly: Boolean(pickupOnly) }),
        ...(category && { category }),
        ...(subcategory && { subcategory }),
        ...(latitude !== undefined && latitude !== null && { latitude: Number(latitude) }),
        ...(longitude !== undefined && longitude !== null && { longitude: Number(longitude) }),
      },
    });

    return NextResponse.json(merchant, { status: 201 });
  } catch (error) {
    console.error("Error creating merchant:", error);
    return NextResponse.json(
      { error: "Failed to create merchant" },
      { status: 500 }
    );
  }
}
