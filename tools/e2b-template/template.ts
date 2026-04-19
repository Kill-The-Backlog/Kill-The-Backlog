import { Template, waitForURL } from "e2b";

const OPENCODE_PORT = 4096;
const OPENCODE_VERSION = "1.4.11";

export const template = Template()
  .fromImage("e2bdev/base")
  .runCmd(
    [
      "apt-get update",
      "apt-get install -y --no-install-recommends curl ca-certificates",
      "rm -rf /var/lib/apt/lists/*",
    ],
    { user: "root" },
  )
  .runCmd(
    [
      // The opencode installer hardcodes $HOME/.opencode/bin and ignores any
      // install-dir env var, so as root it lands in /root/.opencode/bin where
      // the non-root sandbox user cannot reach it. Pin the version for
      // reproducible builds, skip the installer's shell-rc edits (never
      // sourced in this image), and relocate the binary onto the system PATH.
      `curl -fsSL https://opencode.ai/install | bash -s -- --version ${OPENCODE_VERSION} --no-modify-path`,
      "mv /root/.opencode/bin/opencode /usr/local/bin/opencode",
      "rm -rf /root/.opencode",
    ],
    { user: "root" },
  )
  // Ready only once opencode's HTTP API responds on /global/health.
  .setStartCmd(
    `opencode serve --hostname 0.0.0.0 --port ${OPENCODE_PORT}`,
    waitForURL(`http://127.0.0.1:${OPENCODE_PORT}/global/health`),
  );
