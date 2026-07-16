"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Plus, Search, Send, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import type { Business, WorkspaceMembership } from "@/types";
import { readString } from "@/lib/services/appwriteServices";

export function InternalCommunication({ business, profile, members }: { business: Business | null; profile: any; members: WorkspaceMembership[] }) {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const handledTarget = useRef("");
  const identity = profile?.userId || "";

  const loadSessions = useCallback(async () => {
    if (!business?.$id || !identity) return;
    const response = await fetch(`/api/internal-chat?businessId=${business.$id}&userId=${identity}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) { setSessions(data.sessions || []); setSelected((current) => current || searchParams.get("session") || data.sessions?.[0]?.$id || ""); }
  }, [business?.$id, identity, searchParams]);
  const loadMessages = useCallback(async () => {
    if (!selected || !identity) return;
    const response = await fetch(`/api/internal-chat?sessionId=${selected}&userId=${identity}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setMessages(data.messages || []);
  }, [identity, selected]);

  useEffect(() => { void loadSessions(); const timer = window.setInterval(loadSessions, 5000); return () => window.clearInterval(timer); }, [loadSessions]);
  useEffect(() => { setMessages([]); void loadMessages(); const timer = window.setInterval(loadMessages, 3000); return () => window.clearInterval(timer); }, [loadMessages]);

  const title = (session: any) => {
    const ids = Array.isArray(session.participantIds) ? session.participantIds.map(String) : [];
    const names = Array.isArray(session.participantNames) ? session.participantNames.map(String) : [];
    const index = ids.findIndex((id: string) => id !== identity);
    return names[index < 0 ? 0 : index] || readString(session, "title") || "Internal conversation";
  };
  const visibleSessions = sessions.filter((session) => title(session).toLowerCase().includes(query.toLowerCase()));
  const candidates = useMemo(() => members.filter((member) => member.userId && member.userId !== identity && member.status !== "inactive"), [identity, members]);

  async function create(member: WorkspaceMembership) {
    if (!business) return;
    const response = await fetch("/api/internal-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", businessId: business.$id, userId: identity, targetUserId: member.userId, targetName: member.memberName, conversationType: member.role === "partner" ? "partner" : "team" }) });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || "Conversation could not be created."); return; }
    setNewOpen(false); await loadSessions(); setSelected(data.session.$id);
  }

  useEffect(() => {
    const targetUserId = searchParams.get("startUserId") || "";
    if (!business?.$id || !identity || !targetUserId || handledTarget.current === `${business.$id}:${targetUserId}`) return;
    const member = members.find((item) => item.userId === targetUserId && item.status !== "inactive");
    if (!member) return;
    handledTarget.current = `${business.$id}:${targetUserId}`;
    const requestedName = searchParams.get("startName")?.trim();
    void create({ ...member, memberName: requestedName || member.memberName });
  }, [business?.$id, identity, members, searchParams]);
  async function send() {
    const text = input.trim(); if (!text || !selected || !business) return;
    setInput("");
    const response = await fetch("/api/internal-chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", businessId: business.$id, userId: identity, sessionId: selected, text }) });
    const data = await response.json();
    if (!response.ok) { setInput(text); toast.error(data.error || "Message could not be sent."); return; }
    setMessages((current) => [...current.filter((item) => item.$id !== data.message.$id), data.message]); void loadSessions();
  }

  return <div className="space-y-5">
    <header className="flex items-end justify-between border-b pb-5"><div><p className="text-xs font-bold uppercase text-blue-600">{business?.name}</p><h1 className="mt-2 text-3xl font-bold">Communication</h1><p className="mt-2 text-sm text-slate-600">Private conversations with your team and connected partners.</p></div><button onClick={() => setNewOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white"><Plus size={17}/>New conversation</button></header>
    <section className="grid h-[calc(100vh-12rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-lg border bg-white md:grid-cols-[280px_1fr]">
      <aside className="border-r"><div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="h-9 w-full rounded-md border bg-slate-50 pl-9 pr-3 text-sm"/></div></div><div className="divide-y overflow-y-auto">{visibleSessions.map((session) => <button key={session.$id} onClick={() => setSelected(session.$id)} className={`w-full p-3 text-left ${selected === session.$id ? "bg-blue-50" : "hover:bg-slate-50"}`}><p className="truncate text-sm font-bold text-slate-900">{title(session)}</p><p className="mt-1 truncate text-xs text-slate-500">{readString(session,"lastMessage") || (session.conversationType === "partner" ? "Partner conversation" : "Team conversation")}</p></button>)}{!visibleSessions.length && <p className="p-6 text-center text-xs text-slate-500">No conversations yet.</p>}</div></aside>
      <div className="flex min-w-0 flex-col">{selected ? <><div className="border-b p-4"><p className="font-bold">{title(sessions.find((item) => item.$id === selected) || {})}</p><p className="text-xs text-slate-500">Business internal communication</p></div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">{messages.map((message) => { const mine = readString(message,"senderId") === identity; return <div key={message.$id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-blue-600 text-white" : "border bg-white text-slate-800"}`}>{!mine && <p className="mb-1 text-[10px] font-bold text-blue-600">{readString(message,"senderName")}</p>}<p>{readString(message,"messageText")}</p><p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{new Date(readString(message,"createdAt") || message.$createdAt).toLocaleString()}</p></div></div>})}</div><div className="flex gap-2 border-t p-3"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void send()} placeholder="Write an internal message" className="h-10 flex-1 rounded-md border px-3 text-sm"/><button onClick={() => void send()} disabled={!input.trim()} className="grid size-10 place-items-center rounded-md bg-blue-600 text-white disabled:opacity-40"><Send size={17}/></button></div></> : <div className="grid flex-1 place-items-center text-center"><div><MessageSquare className="mx-auto size-9 text-slate-300"/><p className="mt-3 font-bold">Select a conversation</p><p className="mt-1 text-sm text-slate-500">Team and partner messages stay inside this business.</p></div></div>}</div>
    </section>
    {newOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-lg bg-white shadow-xl"><header className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-bold">New conversation</h2><p className="mt-1 text-sm text-slate-500">Choose an active team member or enrolled partner.</p></div><button onClick={() => setNewOpen(false)}><X/></button></header><div className="max-h-96 divide-y overflow-y-auto p-3">{candidates.map((member) => <button key={member.$id} onClick={() => void create(member)} className="flex w-full items-center gap-3 rounded-md p-3 text-left hover:bg-slate-50"><span className="grid size-10 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{(member.memberName || "M").slice(0,2).toUpperCase()}</span><span><strong className="block text-sm">{member.memberName || `Member ${member.userId.slice(-4)}`}</strong><small className="capitalize text-slate-500">{member.role.replaceAll("_"," ")}</small></span></button>)}{!candidates.length && <div className="py-12 text-center"><Users className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-500">Add a team member or partner first.</p></div>}</div></div></div>}
  </div>;
}
