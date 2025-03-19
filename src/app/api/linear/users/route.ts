import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    console.log("Token in users API:", token);
    
    if (!token || !token.accessToken) {
      console.log("No access token found in users API");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    console.log("Fetching users with token:", token.accessToken);
    
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
              users {
                nodes {
                  id
                  name
                  displayName
                  avatarUrl
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
      console.log("Successfully fetched users:", data.data.users.nodes.length);
      
      // Transform the data to match our expected format
      const users = data.data.users.nodes.map((user: any) => ({
        id: user.id,
        name: user.name,
        displayName: user.displayName || user.name,
        avatarUrl: user.avatarUrl || undefined,
      }));
      
      return NextResponse.json({ users });
    } catch (fetchError) {
      console.error("Error in fetching users:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch users from Linear API", details: fetchError instanceof Error ? fetchError.message : String(fetchError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in users API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
