import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await new Promise((res) => setTimeout(res, Number(params.id) * 100));

  const c = cookies();

  const cookieValue = c.get("TEST_COOKIE")?.value;
  if (cookieValue) {
    return Response.json({
      data: {
        message: `This request had TEST_COOKIE set to ${cookieValue}`,
        latency: Number(params.id) * 100,
      },
    });
  }

  return Response.json({
    data: {
      message: `This request did not have a TEST_COOKIE`,
      latency: Number(params.id) * 100,
    },
  });
}
