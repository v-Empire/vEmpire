import { LinkStatus } from "./types";

export const status = {
  LIVE: <LinkStatus>{
    text: "LIVE",
    color: "failure",
  },
  SOON: <LinkStatus>{
    text: "SOON",
    color: "warning",
  },
  NEW: <LinkStatus>{
    text: "NEW",
    color: "success",
  },
};


export const socials = [
  // {
  //   label: "Telegram",
  //   icon: "TelegramIcon",
  //   items: [
  //     // {
  //     //   label: "English",
  //     //   href: "https://t.me/TachiSwap",
  //     // },
  //     // {
  //     //   label: "Announcements",
  //     //   href: "https://t.me/TachiSwapAnn",
  //     // },
  //   ],
  // },
  // {
  //   label: "Twitter",
  //   icon: "TwitterIcon",
  //   href: "https://twitter.com/SwapTachi",
  // },
];

export const MENU_HEIGHT = 64;
export const MENU_ENTRY_HEIGHT = 48;
export const SIDEBAR_WIDTH_FULL = 200;
export const SIDEBAR_WIDTH_REDUCED = 50;
