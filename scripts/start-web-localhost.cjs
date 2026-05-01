const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const HOST = "localhost";
const PORT = 8081;
const projectRoot = path.resolve(__dirname, "..");
const expoCli = path.join(projectRoot, "node_modules", "expo", "bin", "cli");

function isPortAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && (error.code === "EADDRINUSE" || error.code === "EACCES")) {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function main() {
  const available = await isPortAvailable(PORT, HOST);

  if (!available) {
    console.error(
      `Port ${PORT} is already in use. Web Google OAuth is pinned to http://${HOST}:${PORT}, so this script will not switch to another origin.\n` +
      `Stop the process using port ${PORT}, then run npm run web again.`,
    );
    process.exit(1);
  }

  const child = spawn(
    process.execPath,
    [expoCli, "start", "--web", "--localhost", "--port", String(PORT)],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
