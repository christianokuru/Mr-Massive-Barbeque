import { AnnouncementBar } from "@/components/store/announcement-bar";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { getSettings } from "@/server/catalogue";

async function WhatsApp() {
  const { whatsappNumber } = await getSettings();
  return whatsappNumber ? <WhatsAppButton number={whatsappNumber} /> : null;
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-full bg-bonnet px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
      <WhatsApp />
    </>
  );
}
