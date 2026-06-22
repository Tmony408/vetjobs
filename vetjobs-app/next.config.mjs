/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // produces a slim, self-contained build for Docker
};
export default nextConfig;
