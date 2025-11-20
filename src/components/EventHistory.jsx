import React from 'react';
import { X, Clock, Video, Settings as SettingsIcon } from 'lucide-react';
import { format } from 'date-fns';

const EventHistory = ({ isOpen, onClose, historyData }) => {
    if (!isOpen) return null;

    const hasData = historyData && (historyData.videoId || historyData.history?.length > 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border-2 border-[#4FCEEC] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl shadow-[#4FCEEC]/20">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-[#4FCEEC]">Event History</h2>
                        <p className="text-sm text-gray-400 mt-1">Cached data and past selections for this event</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!hasData ? (
                        <div className="text-center py-12">
                            <Clock className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No history data for this event yet</p>
                            <p className="text-sm text-gray-600 mt-2">Once you select a webcast, it will be cached here</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Current Cached Webcast */}
                            {historyData.videoId && (
                                <div className="bg-black border border-[#4FCEEC]/30 rounded-xl p-4">
                                    <h3 className="text-[#4FCEEC] font-bold mb-3 flex items-center gap-2">
                                        <Video className="w-5 h-5" /> Current Cached Webcast
                                    </h3>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-gray-400 text-sm">Video ID:</span>
                                            <p className="text-white font-mono">{historyData.videoId}</p>
                                        </div>
                                        {historyData.url && (
                                            <div>
                                                <span className="text-gray-400 text-sm">URL:</span>
                                                <a
                                                    href={historyData.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#4FCEEC] hover:underline text-sm break-all block"
                                                >
                                                    {historyData.url}
                                                </a>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-400 text-sm">Selected:</span>
                                            <p className="text-white">{format(new Date(historyData.selectedAt), 'PPpp')}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Method:</span>
                                            <p className="text-white capitalize">{historyData.method.replace(/-/g, ' ')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* History Timeline */}
                            {historyData.history && historyData.history.length > 0 && (
                                <div className="bg-black border border-gray-800 rounded-xl p-4">
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <Clock className="w-5 h-5" /> History Timeline
                                    </h3>
                                    <div className="space-y-3">
                                        {[...historyData.history].reverse().map((entry, idx) => (
                                            <div key={idx} className="border-l-2 border-[#4FCEEC] pl-4 pb-3 last:pb-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-white font-semibold capitalize">{entry.action.replace(/-/g, ' ')}</p>
                                                        <p className="text-xs text-gray-500">{format(new Date(entry.timestamp), 'PPpp')}</p>
                                                    </div>
                                                    {entry.method && (
                                                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                                                            {entry.method}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.videoId && (
                                                    <p className="text-sm text-gray-400 mt-1 font-mono">ID: {entry.videoId}</p>
                                                )}
                                                {entry.url && (
                                                    <a
                                                        href={entry.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#4FCEEC] hover:underline text-xs break-all block mt-1"
                                                    >
                                                        {entry.url}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventHistory;
