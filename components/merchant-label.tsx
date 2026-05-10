"use client";

import { useTranslations } from "next-intl";
import type { VendorType } from "@/lib/taxonomy";

export interface MerchantLabelProps {
  vendorType: VendorType;
  capitalize?: boolean;
}

export function MerchantLabel({ vendorType }: MerchantLabelProps) {
  const t = useTranslations("merchant.label");
  return <>{t(vendorType)}</>;
}

export function getMerchantLabel(t: (key: string) => string, vendorType: VendorType): string {
  return t(`merchant.label.${vendorType}`);
}
