import stylesheet from "../tailwind.css?url";

/**
 * 通用的CSS鏈接配置，可以在各個布局組件中重用
 */
export const commonLinks = () => [
  { rel: "icon", type: "image/x-icon", href: "/rubber-duck.ico" },
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap",
  },
];

/**
 * 通用的元數據配置
 */
export const commonMeta = () => {
  return [
    { title: "Grading System" },
    { name: "description", content: "A grading system application" }
  ];
}; 