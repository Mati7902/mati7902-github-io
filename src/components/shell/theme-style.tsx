import { readableOn } from "@/lib/color";
import { getPublicSettingsSafe } from "@/server/services/public-settings";

/**
 * Inyecta la paleta configurada en Administración como variables CSS. Las escalas y los tonos
 * derivados (globals.css) se calculan a partir de estos colores; el texto sobre el color
 * principal y sobre el acento se elige blanco u oscuro según el contraste.
 */
export async function ThemeStyle() {
  const { theme } = await getPublicSettingsSafe();
  // La marca va en --brand-*: el modo oscuro deriva de ahí sus tonos aclarados (globals.css).
  const css = `:root{--brand-primary:${theme.primary};--brand-accent:${theme.accent};--background:${theme.background};}:root:not(.dark){--primary-foreground:${readableOn(theme.primary)};--accent-foreground:${readableOn(theme.accent)};}`;
  return <style id="theme-overrides" dangerouslySetInnerHTML={{ __html: css }} />;
}
