import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "What's in my closet — 옷장 지킴이",
    short_name: "옷장 지킴이",
    description:
      "비슷한 옷 중복 구매를 막고, 어디 뒀는지 찾고, 오늘 뭘 입을지 추천받는 AI 옷장 지킴이.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    lang: "ko",
    icons: [],
  };
}
