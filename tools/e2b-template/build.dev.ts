import { defaultBuildLogger, Template } from "e2b";

import { template } from "./template.ts";

async function main() {
  await Template.build(template, "e2b-template-dev", {
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
