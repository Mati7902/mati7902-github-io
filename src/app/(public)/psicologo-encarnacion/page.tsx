import { landingMetadata, SeoLandingPage } from "@/components/public/seo-landing";

export const revalidate = 300;

export const generateMetadata = () => landingMetadata("psicologo-encarnacion");

export default function Page() {
  return <SeoLandingPage slug="psicologo-encarnacion" />;
}
