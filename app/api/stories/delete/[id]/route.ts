import { NextResponse } from "next/server";
import { dbConnect } from "../../../../lib/mongodb";
import Story from "../../../../models/Story";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";


export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ UNWRAP PARAMS
    const { id } = await context.params;

    const story = await Story.findById(id);
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (story.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Story.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE STORY ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}
