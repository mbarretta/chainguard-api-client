import pkg from "../package.json";

export const VERSION: string = pkg.version;
export const USER_AGENT = `chainguard-api-client/${VERSION}`;
