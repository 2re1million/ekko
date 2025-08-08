import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Meeting } from '@/shared/types';

export const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      loadMeeting(id);
    }
  }, [id]);

  const loadMeeting = async (meetingId: string) => {
    try {
      const meetingData = await window.electronAPI.database.getMeeting(meetingId);
      setMeeting(meetingData);
    } catch (error) {
      console.error('Failed to load meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'markdown') => {
    if (!meeting) return;

    try {
      const result = await window.electronAPI.dialog.showSaveDialog({
        defaultPath: `${meeting.title}.${format === 'pdf' ? 'pdf' : 'md'}`,
        filters: [
          { name: format.toUpperCase(), extensions: [format === 'pdf' ? 'pdf' : 'md'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        // TODO: Implement export functionality
        console.log(`Exporting to ${format}:`, result.filePath);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting not found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleExport('markdown')}
            className="btn-secondary text-sm"
          >
            Export Markdown
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-secondary text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary text-sm"
          >
            {isEditing ? 'Save Changes' : 'Edit Meeting'}
          </button>
        </div>
      </div>

      {/* Meeting Info */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={meeting.title}
                className="input-field text-2xl font-bold w-full"
                placeholder="Meeting title"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Date:</span>
            <p className="text-gray-600">{formatDate(meeting.date)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Duration:</span>
            <p className="text-gray-600">{formatDuration(meeting.duration)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Participants:</span>
            <p className="text-gray-600">{meeting.participants.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
        {isEditing ? (
          <textarea
            value={meeting.summary}
            className="input-field w-full h-32 resize-none"
            placeholder="Meeting summary..."
          />
        ) : (
          <div className="prose max-w-none text-gray-700">
            {meeting.summary || 'No summary available'}
          </div>
        )}
      </div>

      {/* Decisions */}
      {meeting.decisions.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Decisions Made</h2>
          <ul className="space-y-2">
            {meeting.decisions.map((decision, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {meeting.actionItems.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Action Items</h2>
          <div className="space-y-3">
            {meeting.actionItems.map((actionItem) => (
              <div
                key={actionItem.id}
                className={`flex items-center p-3 rounded-lg border ${
                  actionItem.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={actionItem.completed}
                  className="mr-3"
                  readOnly
                />
                <div className="flex-1">
                  <div className={`font-medium ${actionItem.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {actionItem.task}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="mr-4">👤 {actionItem.assignee}</span>
                    {actionItem.dueDate && (
                      <span className="mr-4">📅 {new Date(actionItem.dueDate).toLocaleDateString('no-NO')}</span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      actionItem.priority === 'high' ? 'bg-red-100 text-red-800' :
                      actionItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {actionItem.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
        {isEditing ? (
          <textarea
            value={meeting.notes || ''}
            className="input-field w-full h-24 resize-none"
            placeholder="Add your notes..."
          />
        ) : (
          <div className="text-gray-700">
            {meeting.notes || 'No additional notes'}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
          <span className="text-sm text-gray-500">Full conversation</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {meeting.transcript || 'Transcript not available'}
          </pre>
        </div>
      </div>
    </div>
  );
};