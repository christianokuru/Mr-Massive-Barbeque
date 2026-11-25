import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Link href="/" aria-label="Massive Barbeque home">
        <Image src="/brand/logo.png" alt="Massive Barbeque" width={467} height={530} className="h-24 w-auto" />
      </Link>
      <p className="eyebrow">404</p>
      <h1 className="text-[length:clamp(32px,9vw,48px)] leading-[0.88] md:text-display">This plate isn&apos;t on the menu</h1>
      <p className="max-w-md text-body-lg text-smoke">The page you&apos;re looking for has moved or never existed. The grill is still hot though.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/menu" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">See the menu</Link>
        <Link href="/" className="inline-flex h-12 items-center rounded-full border-2 border-oxblood px-6 font-bold text-oxblood">Home</Link>
      </div>
    </main>
  );
}
