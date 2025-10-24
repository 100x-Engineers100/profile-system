import { NextResponse } from 'next/server';
import { updateProjectIdea, getProjectIdeasByUserId } from '@/lib/db/queries';

export async function PUT(request: Request) {
  try {
    const { userId, moduleName, problem_statement, solution, features } = await request.json();
    if (!userId || !moduleName || !problem_statement || !solution || !features) {
      return NextResponse.json({ error: 'Missing required fields (userId, moduleName, problem_statement, solution, features)' }, { status: 400 });
    }

    const existingIdeas = await getProjectIdeasByUserId(userId, moduleName);

    if (!existingIdeas || existingIdeas.length === 0) {
      return NextResponse.json({ error: 'Project idea not found for this user and module' }, { status: 404 });
    }

    const projectIdeaId = existingIdeas[0].id;

    const updatedIdea = await updateProjectIdea(projectIdeaId, { problem_statement, solution, features });
    if (!updatedIdea) {
      return NextResponse.json({ error: 'Failed to update project idea' }, { status: 404 });
    }
    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error("Error in project-ideas-update API:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}