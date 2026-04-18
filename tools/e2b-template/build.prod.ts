import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template.ts";

async function main() {
  await Template.build(template, "e2b-template", {
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
