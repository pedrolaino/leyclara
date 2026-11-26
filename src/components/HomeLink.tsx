"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// A link to the page you're already on does nothing, so on home it tells the assistant to start over.
export const HOME_EVENT = "leyclara:home";

export function HomeLink({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link href="/" className="brand" onClick={() => pathname === "/" && window.dispatchEvent(new Event(HOME_EVENT))}>
      {children}
    </Link>
  );
}
