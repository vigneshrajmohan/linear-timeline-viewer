'use client';

import React, { useState, useEffect, useRef } from 'react';
import Timeline, {
  TimelineHeaders,
  SidebarHeader,
  DateHeader,
  TimelineMarkers,
  CustomMarker
} from 'react-calendar-timeline';
import moment from 'moment';
import { LinearIssue, LinearUser } from '@/services/linear';

interface TimelineProps {
  issues: LinearIssue[];
  users: LinearUser[];
}

const LinearTimeline: React.FC<TimelineProps> = ({ issues, users }) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Format issues for the timeline
  const items = issues
    .filter(issue => !selectedUser || (issue.assignee && issue.assignee.id === selectedUser))
    .map(issue => {
      // Determine start and end dates - ensure we're using local timezone
      // Adjust for the 2-day shift by subtracting 2 days
      const startDate = issue.startedAt 
        ? moment(issue.startedAt).local().subtract(2, 'days')
        : moment(issue.createdAt).local().subtract(2, 'days');
      
      // If due date exists, use it as end date, otherwise use completed date or current date + 1 day
      const endDate = issue.dueDate 
        ? moment(issue.dueDate).local().subtract(2, 'days')
        : (issue.completedAt 
            ? moment(issue.completedAt).local().subtract(2, 'days')
            : moment(startDate).local().add(1, 'day'));
      
      // Determine color based on state
      let itemColor = '#3498db'; // Default blue
      
      if (issue.state.name.toLowerCase().includes('done') || 
          issue.state.name.toLowerCase().includes('complete')) {
        itemColor = '#2ecc71'; // Green for completed
      } else if (issue.state.name.toLowerCase().includes('backlog')) {
        itemColor = '#95a5a6'; // Gray for backlog
      } else if (issue.state.name.toLowerCase().includes('in progress')) {
        itemColor = '#f39c12'; // Orange for in progress
      } else if (issue.state.name.toLowerCase().includes('blocked')) {
        itemColor = '#e74c3c'; // Red for blocked
      }
      
      // Use state color if available
      if (issue.state.color) {
        itemColor = issue.state.color;
      }
      
      return {
        id: issue.id,
        group: issue.assignee ? issue.assignee.id : 'unassigned',
        title: `${issue.identifier}: ${issue.title}`,
        start_time: startDate.valueOf(),
        end_time: endDate.valueOf(),
        itemProps: {
          style: {
            backgroundColor: itemColor,
            color: '#fff',
            borderRadius: '4px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          },
        },
        issue,
      };
    });
  
  // Create groups from users
  const groups = [
    { id: 'unassigned', title: 'Unassigned' },
    ...users.map(user => ({
      id: user.id,
      title: user.displayName || user.name,
      rightTitle: '',
      stackItems: true,
    })),
  ];
  
  // Calculate time range - adjust to show a better range, with 2-day shift adjustment
  const minTime = moment().local().subtract(1, 'month').subtract(2, 'days').startOf('month');
  const maxTime = moment().local().add(2, 'months').subtract(2, 'days').endOf('month');
  
  // Get the current time in local timezone, adjusted for the 2-day shift
  const now = moment().local().subtract(2, 'days');
  
  // Custom today marker function to ensure correct positioning
  const getTodayMarkerPosition = () => {
    return now;
  };
  
  // Calculate height based on number of groups
  const timelineHeight = Math.max(500, groups.length * 50 + 100);
  
  return (
    <div className="h-full flex flex-col">
      <div className="timeline-container">
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Linear Timeline</h2>
          <div className="flex items-center space-x-2">
            <label className="font-medium">Filter by assignee:</label>
            <select
              className="border rounded p-2"
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value || null)}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="timeline-scrollable-wrapper"
        >
          <div style={{ height: timelineHeight, minWidth: '100%' }}>
            <Timeline
              groups={groups}
              items={items}
              defaultTimeStart={minTime.valueOf()}
              defaultTimeEnd={maxTime.valueOf()}
              sidebarWidth={200}
              lineHeight={50}
              itemHeightRatio={0.8}
              canMove={false}
              canResize={false}
              stackItems
              minZoom={24 * 60 * 60 * 1000} // 1 day minimum zoom
              maxZoom={31 * 24 * 60 * 60 * 1000} // 1 month maximum zoom
              itemRenderer={({ item, itemContext, getItemProps }) => {
                const backgroundColor = item.itemProps?.style?.backgroundColor || '#3498db';
                const { key, ...otherProps } = getItemProps({
                  style: {
                    backgroundColor,
                    color: '#fff',
                    borderRadius: '4px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none', // Disable all click interactions
                  }
                });
                
                return (
                  <div
                    key={key}
                    {...otherProps}
                  >
                    <div className="rct-item-content" style={{ maxHeight: `${itemContext.dimensions.height}px` }}>
                      {itemContext.title}
                    </div>
                  </div>
                );
              }}
            >
              <TimelineHeaders>
                <SidebarHeader>
                  {({ getRootProps }) => (
                    <div {...getRootProps()} className="font-bold p-2">
                      Assignee
                    </div>
                  )}
                </SidebarHeader>
                <DateHeader unit="primaryHeader" />
                <DateHeader />
              </TimelineHeaders>
              <TimelineMarkers>
                <CustomMarker date={now.valueOf()}>
                  {({ styles }) => (
                    <div className="custom-today-marker" style={{
                      ...styles,
                      backgroundColor: '#ff0000',
                      width: '2px',
                      height: '100%',
                      zIndex: 3
                    }} />
                  )}
                </CustomMarker>
              </TimelineMarkers>
            </Timeline>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearTimeline;
