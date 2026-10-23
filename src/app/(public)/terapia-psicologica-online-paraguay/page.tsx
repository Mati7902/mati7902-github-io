import { landingMetadata, SeoLandingPage } from "@/components/public/seo-landing";

export const revalidate = 300;

export const generateMetadata = () => landingMetadata("terapia-psicologica-online-paraguay");

export default function Page() {
  return <SeoLandingPage slug="terapia-psicologica-online-paraguay" />;
}
