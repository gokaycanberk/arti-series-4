"use client";

import {
  SITE_MENU_TOGGLE_LEFT,
  SITE_MENU_TOGGLE_TOP,
} from "./constants";
import { MenuToggleButton } from "./MenuToggleButton";
import { useSiteMenu } from "./SiteMenuContext";

/** Her sayfada görünür — kapalı: hamburger, açık: + */
export function SiteMenuToggle() {
  const { isOpen, toggleMenu } = useSiteMenu();

  return (
    <MenuToggleButton
      open={isOpen}
      onClick={toggleMenu}
      style={{
        position: "fixed",
        top: SITE_MENU_TOGGLE_TOP,
        left: SITE_MENU_TOGGLE_LEFT,
        zIndex: 70,
      }}
    />
  );
}
