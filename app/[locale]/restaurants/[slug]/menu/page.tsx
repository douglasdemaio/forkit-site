"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Full menu view just redirects to the restaurant page
// which already shows the full menu
export default function MenuPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/restaurants/${params.slug}`);
  }, [params.slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-forkit-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
