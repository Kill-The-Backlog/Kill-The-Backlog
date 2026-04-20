import Anthropic from "@anthropic-ai/sdk";

import { serverEnv } from "#lib/.server/env/server.js";

export const anthropic = new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });
