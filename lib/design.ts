import archive from "@/design-reference/figma/design-archive.json";

export type DesignNode = {
  kind: "frame" | "text" | "icon";
  name?: string; text?: string; icon?: string; children?: DesignNode[];
  axis?: "H" | "V"; w?: number | "fill" | "hug"; h?: number | "fill" | "hug";
  gap?: number; pad?: number[]; bg?: string | null; border?: string | null;
  radius?: number; align?: string; justify?: string; color?: string;
  size?: number; bold?: boolean; alignText?: string;
  instanceRef?: string; over?: Record<string,string>; target?: string;
  _w?: number; _h?: number;
};
type Screen = { key: string; title: string; device: "Desktop" | "Mobile"; resolved: DesignNode };
let screens: Screen[] | null = null;
export function getScreens(key: string) {
  if (!screens) {
    screens = (archive as { screens: Screen[] }).screens;
  }
  return screens.filter((screen) => screen.key === key);
}
export function isScreen(key: string) {
  return getScreens(key).length > 0 && !["login", "senha", "senha-enviada"].includes(key);
}
