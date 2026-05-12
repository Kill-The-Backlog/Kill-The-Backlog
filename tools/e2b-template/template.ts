import { Template, waitForURL } from "e2b";

const OPENCODE_PORT = 4096;
// Version 1.14.42 has a known issue (see: https://github.com/anomalyco/opencode/issues/26697);
// pinning to the previous stable version.
const OPENCODE_VERSION = "1.14.41";
const CODE_SERVER_VERSION = "4.118.0";

export const template = Template()
  .fromNodeImage("24")
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
  .runCmd(
    `curl -fsSL https://code-server.dev/install.sh | sh -s -- --version=${CODE_SERVER_VERSION} --method=standalone --prefix=/usr/local`,
    { user: "root" },
  )
  // Global opencode config for the non-root sandbox user that runs
  // `opencode serve`. We deny the `question` tool so the model can't stall
  // a turn waiting on an answer in this headless HTTP-only deployment —
  // there's no one to answer. opencode's default is "allow all", so this
  // file intentionally only denies `question` and leaves everything else
  // at defaults; adding a wildcard `"*": "allow"` would re-enable
  // `question` (upstream issue anomalyco/opencode#13827).
  .makeDir("/home/user/.config/opencode", { user: "user" })
  .copy("./opencode.json", "/home/user/.config/opencode/opencode.json", {
    user: "user",
  })
  // Ready only once opencode's HTTP API responds on /global/health.
  .setStartCmd(
    `opencode serve --hostname 0.0.0.0 --port ${OPENCODE_PORT}`,
    waitForURL(`http://127.0.0.1:${OPENCODE_PORT}/global/health`),
  );
