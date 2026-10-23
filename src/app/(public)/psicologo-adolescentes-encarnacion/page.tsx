import { landingMetadata, SeoLandingPage } from "@/components/public/seo-landing";

export const revalidate = 300;

export const generateMetadata = () => landingMetadata("psicologo-adolescentes-encarnacion");

export default function Page() {
  return <SeoLandingPage slug="psicologo-adolescentes-encarnacion" />;
}
