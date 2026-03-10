const fs = require("fs");
const path = require("path");

// Read .env file
const envFile = path.join(__dirname, ".env");
const env = {};
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
}

module.exports = {
  apps: [
    {
      name: "zak-ui",
      script: "npx",
      args: "tsx server/index.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        CLAUDECODE: "",
        ...env,
      },
    },
  ],
};
