import type { Metadata } from "next";
import { MenuView } from "@/components/store/menu-view";

export const metadata: Metadata = {
  title: "Menu: grilled catfish, croaker, chicken & turkey",
  description:
    "Order fire-grilled catfish, croaker, chicken, turkey, pepper soup and sides online. Hot delivery across Lagos: Lekki, VI, Ikoyi, Ikeja and the Mainland.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage({ searchParams }: PageProps<"/menu">) {
  return (
    <MenuView
      eyebrow="Our menu"
      title="Fresh off the grill"
      intro="Catfish, croaker, chicken, turkey, pepper soup and sides, grilled to order. Pick a size, add sides, and we'll bring it hot."
      searchParams={searchParams}
    />
  );
}
