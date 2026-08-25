import React, { useState } from 'react';
import {
  MessageSquare, Search, Send, Circle, MoreVertical,
  Paperclip, Phone, Video
} from 'lucide-react';

interface Conversation {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
}

export const Chat: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');

  // Initial structure for future chat backend integration
  const conversations: Conversation[] = [];

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-[#12160F] border border-[#212B1E] rounded-2xl overflow-hidden shadow-2xl">
      {/* Conversation List Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[#212B1E] bg-[#0A0D0A] flex flex-col shrink-0 ${
        selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header & Search */}
        <div className="p-4 border-b border-[#212B1E] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-400" />
              Chat Messages
            </h2>
            <span className="text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded-full font-semibold">
              Live
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#212B1E] border border-[#37452E] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-sage-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-sage-600 mb-1 animate-pulse" />
              <p className="text-xs font-bold text-sage-400">No Conversations Yet</p>
              <p className="text-[11px] text-sage-500 leading-relaxed">
                Direct messaging infrastructure is active. Conversations with instructors and peers will appear here.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  selectedConversation?.id === conv.id
                    ? 'bg-primary-600/20 border border-primary-500/40 text-white'
                    : 'hover:bg-[#212B1E]/70 text-sage-300 border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                    {conv.avatarUrl ? (
                      <img src={conv.avatarUrl} alt={conv.name} className="w-full h-full object-cover" />
                    ) : (
                      conv.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  {conv.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0A0D0A] rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold truncate text-white">{conv.name}</p>
                    <span className="text-[10px] text-sage-500">{conv.time}</span>
                  </div>
                  <p className="text-[11px] text-sage-400 truncate">{conv.lastMessage}</p>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-primary-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#12160F] ${
        !selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedConversation ? (
          <>
            {/* Active Conversation Header */}
            <div className="p-3.5 border-b border-[#212B1E] bg-[#0A0D0A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden text-sage-400 hover:text-white p-1"
                >
                  &larr;
                </button>
                <div className="w-9 h-9 rounded-xl bg-primary-600 text-white font-bold text-xs flex items-center justify-center">
                  {selectedConversation.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{selectedConversation.name}</h3>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-emerald-400" /> Online
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sage-400">
                <button className="p-2 hover:bg-[#212B1E] rounded-lg transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-[#212B1E] rounded-lg transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-[#212B1E] rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
              <div className="text-center text-xs text-sage-500 my-4">
                Conversation started
              </div>
            </div>

            {/* Message Input Bar */}
            <div className="p-3 border-t border-[#212B1E] bg-[#0A0D0A]">
              <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
                <button type="button" className="p-2 text-sage-400 hover:text-white transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-[#212B1E] border border-[#37452E] text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0A0D0A]/50">
            <div className="w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Messaging Infrastructure</h3>
            <p className="text-xs text-sage-400 max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the sidebar or search for a classmate or instructor to start direct communication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
