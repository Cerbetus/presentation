/**
 * Renderer registry.
 * This project now uses Office365Provider only.
 */

import { Office365Provider } from "./Office365Provider";

export function getProvider() {
  return Office365Provider;
}

export { Office365Provider };
