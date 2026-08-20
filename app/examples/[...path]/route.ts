import { serve, SERVED_EXAMPLES } from "@/lib/served-files";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return serve(SERVED_EXAMPLES, path);
}
