import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/mongodb';
import Story from '../../../../models/Story';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authOptions';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 🔥 THIS IS THE CRITICAL FIX
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Invalid story id' }, { status: 400 });
  }

  await Story.findByIdAndUpdate(
    id,
    {
      $addToSet: { viewers: session.user.id },
    },
    { new: true }
  );

  return NextResponse.json({ success: true });
}
