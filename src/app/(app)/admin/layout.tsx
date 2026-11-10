import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-900">Área admin</p>
      {children}
    </div>
  );
}
