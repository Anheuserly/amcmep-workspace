"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/utils";
import {
  fetchChatMessages,
  fetchChatSessions,
  sendChatMessage,
  toChatMessage,
  toChatSession,
  userIdentity,
} from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  MessageSquare, Send, Paperclip, Image, Search, MoreVertical, CheckCheck, ChevronLeft
} from "lucide-react";
import type { ChatSession, ChatMessage } from "@/types";

export default function ChatsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadSessions() {
      if (!profile?.userId) return;
      setIsLoading(true);
      try {
        const docs = await fetchChatSessions({ ...userIdentity(profile), limit: 100 });
        const mapped = docs.map((doc) => toChatSession(doc, profile.userId));
        if (!alive) return;
        setSessions(mapped);
        setSelectedSessionId((current) => current ?? mapped[0]?.$id ?? null);
      } catch {
        if (alive) toast.error("Unable to load chats");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadSessions();
    return () => { alive = false; };
  }, [profile]);

  useEffect(() => {
    let alive = true;
    async function loadMessages() {
      if (!selectedSessionId || messagesBySession[selectedSessionId]) return;
      try {
        const docs = await fetchChatMessages(selectedSessionId);
        if (alive) {
          setMessagesBySession((prev) => ({
            ...prev,
            [selectedSessionId]: docs.map(toChatMessage),
          }));
        }
      } catch {
        if (alive) toast.error("Unable to load messages");
      }
    }
    loadMessages();
    return () => { alive = false; };
  }, [messagesBySession, selectedSessionId]);

  const filteredSessions = sessions.filter((s) =>
    s.participantNames.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.lastMessage && s.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedSession = sessions.find((s) => s.$id === selectedSessionId);
  const messages = selectedSessionId ? messagesBySession[selectedSessionId] || [] : [];
  const otherParticipant = selectedSession?.participantNames.find((_, i) => selectedSession.participantIds[i] !== profile?.userId) || "Unknown";

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedSessionId) return;
    const text = messageInput.trim();
    setMessageInput("");
    try {
      const created = await sendChatMessage({
        sessionId: selectedSessionId,
        messageText: text,
        senderId: profile?.userId || "",
        senderName: profile?.name || "You",
      });
      setMessagesBySession((prev) => ({
        ...prev,
        [selectedSessionId]: [...(prev[selectedSessionId] || []), toChatMessage(created)],
      }));
      setSessions((prev) => prev.map((session) => session.$id === selectedSessionId ? {
        ...session,
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
      } : session));
    } catch {
      setMessageInput(text);
      toast.error("Unable to send message");
    }
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-8rem)] -mx-4 lg:-mx-8 -my-4 lg:-my-8">
      <div className="flex h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Session List */}
        <div className={`w-full lg:w-80 border-r border-gray-200 flex flex-col ${mobileChatOpen ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-gray-900">Chats</h1>
              <span className="text-xs text-gray-400">{sessions.length} conversations</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading chats...</div>
            ) : filteredSessions.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="No chats found" description={searchQuery ? "Try a different search term" : "Your app conversations will appear here."} />
            ) : (
              filteredSessions.map((session) => (
                <button
                  key={session.$id}
                  onClick={() => { setSelectedSessionId(session.$id); setMobileChatOpen(true); }}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 ${selectedSessionId === session.$id ? "bg-brand-50 border-l-3 border-brand-600" : "border-l-3 border-transparent"}`}
                >
                  <Avatar src={session.participantAvatars[1]} name={session.participantNames[1] || "User"} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${session.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {session.participantNames[1] || "User"}
                      </p>
                      {session.lastMessageAt && (
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatRelative(session.lastMessageAt)}</span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${session.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {session.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {session.unreadCount > 0 && (
                    <span className="h-5 min-w-[1.25rem] px-1.5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {session.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${mobileChatOpen ? "flex" : "hidden lg:flex"}`}>
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <button onClick={() => setMobileChatOpen(false)} className="lg:hidden p-1 text-gray-500 hover:bg-gray-100 rounded">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Avatar src={selectedSession.participantAvatars[1]} name={otherParticipant} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{otherParticipant}</p>
                  <p className="text-xs text-gray-500">{selectedSession.businessName || "Direct Message"}</p>
                </div>
                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderId === profile?.userId || msg.senderId === "user1";
                  return (
                    <div key={msg.$id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-brand-600 text-white rounded-br-md" : "bg-gray-100 text-gray-800 rounded-bl-md"}`}>
                        <p>{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isMe ? "text-brand-200" : "text-gray-400"}`}>
                          <span>{formatRelative(msg.createdAt)}</span>
                          {isMe && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                    <Image className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 h-10 px-4 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="Select a chat" description="Choose a conversation from the list to start messaging" />
          )}
        </div>
      </div>
    </div>
  );
}
