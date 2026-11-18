import { writeFileSync } from "node:fs";
const origin = new URL(process.argv[2]);
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
) {
  throw new Error("Provide the HTTPS origin of the deployed Railway backend.");
}
writeFileSync(
  "vercel.json",
  JSON.stringify(
    {
      buildCommand: "npm run build",
      outputDirectory: "web/dist",
      rewrites: [
        { source: "/api/:path*", destination: `${origin.origin}/api/:path*` },
        { source: "/((?!assets/).*)", destination: "/index.html" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log("vercel.json generated");
