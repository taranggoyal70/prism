import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRism · Living pull request explanations",
    short_name: "PRism",
    description: "Turn GitHub pull requests into evidence-backed visual explanations.",
    start_url: "/",
    display: "standalone",
    background_color: "#e9f0f5",
    theme_color: "#07111f",
  };
}
