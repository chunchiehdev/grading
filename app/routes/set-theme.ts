import { createThemeAction } from "../theme-provider";
import { themeSessionResolver } from "../sessions.server";

export const action = createThemeAction(themeSessionResolver);