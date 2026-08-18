import { Studio } from "@/components/studio/studio";
import { StudioV1 } from "@/components/studio/studio-v1";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ ui?: string }>;
}) {
  const { videoId } = await params;
  const { ui } = await searchParams;
  if (ui === "v1") return <StudioV1 videoId={videoId} />;
  return <Studio videoId={videoId} />;
}
