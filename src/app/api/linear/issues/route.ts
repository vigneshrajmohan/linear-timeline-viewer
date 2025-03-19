import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    console.log("Token in issues API:", token);
    
    if (!token || !token.accessToken) {
      console.log("No access token found in issues API");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    console.log("Fetching issues with token:", token.accessToken);
    
    try {
      // Use GraphQL directly instead of the SDK
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token.accessToken}`
        },
        body: JSON.stringify({
          query: `
            query {
              issues(
                first: 100, 
                filter: {
                  dueDate: { gte: "${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}" }
                }
              ) {
                nodes {
                  id
                  title
                  identifier
                  description
                  priority
                  state {
                    id
                    name
                    color
                  }
                  assignee {
                    id
                    name
                    displayName
                    avatarUrl
                  }
                  startedAt
                  dueDate
                  completedAt
                  createdAt
                  updatedAt
                  url
                }
              }
            }
          `
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from Linear API:", response.status, errorText);
        throw new Error(`Linear API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Successfully fetched issues:", data.data.issues.nodes.length);
      
      // Transform the data to match our expected format
      const issues = data.data.issues.nodes.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        identifier: issue.identifier,
        description: issue.description || undefined,
        priority: issue.priority,
        state: {
          id: issue.state?.id || 'unknown',
          name: issue.state?.name || 'Unknown',
          color: issue.state?.color || undefined,
        },
        assignee: issue.assignee ? {
          id: issue.assignee.id,
          name: issue.assignee.name,
          displayName: issue.assignee.displayName || issue.assignee.name,
          avatarUrl: issue.assignee.avatarUrl || undefined,
        } : undefined,
        startedAt: issue.startedAt,
        dueDate: issue.dueDate,
        completedAt: issue.completedAt,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        url: issue.url,
      }));
      
      return NextResponse.json({ issues });
    } catch (fetchError) {
      console.error("Error in fetching issues:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch issues from Linear API", details: fetchError instanceof Error ? fetchError.message : String(fetchError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in issues API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
