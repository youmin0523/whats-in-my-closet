// AI/ML service layer. Each service is env-gated: real implementation when its
// key is present, deterministic dev fallback otherwise (so the pipeline runs
// without any keys). See HANDOFF.md.
export * from "./embeddings";
export * from "./tagging";
export * from "./detection";
export * from "./weather";
export * from "./fashn";
export * from "./styling";
export * from "./tag-reader";
