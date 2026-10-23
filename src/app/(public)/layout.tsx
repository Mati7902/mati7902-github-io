import { ContactBar } from "@/components/public/contact-bar";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsappFloat } from "@/components/public/whatsapp-float";
import { brandLogo } from "@/lib/brand";
import { seoDefaults } from "@/lib/config/site";
import { publicWhatsapp, whatsappLink } from "@/lib/contact";
import { getPublicSettingsSafe } from "@/server/services/public-settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { "site.identity": identity, landing } = await getPublicSettingsSafe();
  const whatsapp = publicWhatsapp(identity);
  const href = whatsappLink(identity);
  return (
    <div className="flex min-h-dvh flex-col">
      <ContactBar href={href} display={whatsapp.display} tagline={`${identity.professional_title} en ${seoDefaults.city}, ${identity.country} · ${identity.license}`} />
      <SiteHeader brandName={identity.professional_name} subtitle={identity.brand_subtitle} logoUrl={brandLogo(identity)} showAreas={landing.specialties.length > 0} whatsappHref={href} />
      <main className="flex-1">{children}</main>
      <SiteFooter identity={identity} />
      <WhatsappFloat href={href} display={whatsapp.display} />
    </div>
  );
}
