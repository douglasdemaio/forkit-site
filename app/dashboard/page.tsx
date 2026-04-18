// Moved to app/[locale]/dashboard/page.tsx — this redirect is a safety net
import { redirect } from "next/navigation";
export default function Page() { redirect("/en/dashboard"); }
