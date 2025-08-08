import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Meeting } from '@/shared/types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, title: string} | null>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const allMeetings = await window.electronAPI.database.getAllMeetings();
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;

      // Delete associated audio file if it exists
      if (meeting.audioFilePath) {
        try {
          await window.electronAPI.files.deleteAudio(meeting.audioFilePath);
          console.log('Audio file deleted with meeting');
        } catch (error) {
          console.warn('Failed to delete audio file:', error);
        }
      }

      // Delete the meeting from database
      await window.electronAPI.database.deleteMeeting(meetingId);
      
      // Update local state
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      setDeleteConfirm(null);
      
      console.log('Meeting deleted successfully');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      // TODO: Show error toast to user
    }
  };

  const confirmDelete = (meeting: Meeting) => {
    setDeleteConfirm({ id: meeting.id, title: meeting.title });
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => navigate('/record')}
          className="btn-primary flex items-center"
        >
          <span className="mr-2">🎙️</span>
          New Recording
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎙️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings yet</h3>
          <p className="text-gray-500 mb-6">Start by recording your first meeting</p>
          <button
            onClick={() => navigate('/record')}
            className="btn-primary"
          >
            Record Meeting
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => navigate(`/meeting/${meeting.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">
                      {meeting.title}
                    </h3>
                    <div className="flex space-x-2">
                      {meeting.decisions.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {meeting.decisions.length} decision{meeting.decisions.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {meeting.actionItems.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {meeting.actionItems.length} action{meeting.actionItems.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>{formatDate(meeting.date)}</span>
                    <span>•</span>
                    <span>{formatDuration(meeting.duration)}</span>
                    <span>•</span>
                    <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                  </div>
                  {meeting.participants.length > 0 && (
                    <div className="mt-2 flex items-center">
                      <div className="flex -space-x-1 overflow-hidden">
                        {meeting.participants.slice(0, 3).map((participant, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-500 text-white text-xs font-medium ring-2 ring-white"
                            title={participant}
                          >
                            {participant.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {meeting.participants.length > 3 && (
                          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium ring-2 ring-white">
                            +{meeting.participants.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {meeting.participants.slice(0, 2).join(', ')}
                        {meeting.participants.length > 2 && ` +${meeting.participants.length - 2} more`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(meeting);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="Delete meeting"
                  >
                    🗑️
                  </button>
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Meeting</h2>
              <p className="text-gray-600">
                Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMeeting(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};