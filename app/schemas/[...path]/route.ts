import { serve, SERVED_SCHEMAS } from "@/lib/served-files";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return serve(SERVED_SCHEMAS, path);
}
