import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Platform draft publishing has been removed in spec v2. Content now stops at ready_to_post for manual native scheduling.",
    },
    { status: 410 },
  );
}
