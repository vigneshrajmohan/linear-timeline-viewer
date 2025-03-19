'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import LinearTimeline from '@/components/Timeline';
import Loading from '@/components/Loading';
import Navbar from '@/components/Navbar';
import { LinearIssue, LinearUser } from '@/services/linear';

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (status === 'authenticated' && session?.accessToken) {
        try {
          setLoading(true);
          console.log("Session data:", session);
          
          // Fetch directly from Linear API using GraphQL
          const issuesResponse = await fetch("https://api.linear.app/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.accessToken}`
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
          
          if (!issuesResponse.ok) {
            const errorText = await issuesResponse.text();
            console.error("Linear API response not OK:", issuesResponse.status, errorText);
            throw new Error(`Failed to fetch from Linear API: ${issuesResponse.status} ${errorText.substring(0, 100)}...`);
          }
          
          const data = await issuesResponse.json();
          console.log("Linear API data:", data);
          
          if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
          }
          
          // Transform the data to match our expected format
          const transformedIssues = data.data.issues.nodes.map((issue: any) => ({
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
          
          const transformedUsers = data.data.users.nodes.map((user: any) => ({
            id: user.id,
            name: user.name,
            displayName: user.displayName || user.name,
            avatarUrl: user.avatarUrl || undefined,
          }));
          
          setIssues(transformedIssues);
          setUsers(transformedUsers);
          setError(null);
        } catch (err) {
          console.error('Error fetching data:', err);
          setDebugInfo(err instanceof Error ? err.message : String(err));
          setError('Failed to load data from Linear. Please check the console for more details.');
        } finally {
          setLoading(false);
        }
      } else if (status === 'authenticated' && !session?.accessToken) {
        setError('No access token found in session. Please sign out and sign in again.');
        setDebugInfo(JSON.stringify(session, null, 2));
        setLoading(false);
      }
    };

    fetchData();
  }, [status, session]);

  if (status === 'loading') {
    return <Loading />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-grow p-4">
        {status === 'authenticated' ? (
          loading ? (
            <Loading />
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              {debugInfo && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm overflow-auto max-h-40">
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-4 h-[calc(100vh-120px)]">
              <LinearTimeline issues={issues} users={users} />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
            <h2 className="text-2xl font-bold mb-4">Welcome to Linear Timeline Viewer</h2>
            <p className="text-gray-600 mb-8">Please sign in with Linear to view your issues timeline.</p>
          </div>
        )}
      </main>
      
      <footer className="bg-white py-2 text-center text-gray-500 text-sm">
        <p>Linear Timeline Viewer &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
