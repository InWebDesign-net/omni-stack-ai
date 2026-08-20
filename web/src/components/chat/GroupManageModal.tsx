'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, UserPlus, UserX, Shield, X, Search, Check, AlertCircle } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { useChat, SearchableUser, ChatRoom } from '@/context/ChatContext';
import { useApp } from '@/context/AppContext';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom;
}

export function GroupManageModal({ isOpen, onClose, room }: GroupManageModalProps) {
  const { currentUser } = useApp();
  const { searchEligibleUsers, addMemberToRoom, removeMemberFromRoom } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | number | null>(null);

  // Check if logged-in user is admin
  const currentUserIdStr = currentUser?.id ? String(currentUser.id) : '';
  const adminIdStr = room.adminUser?.id
    ? String(room.adminUser.id)
    : (typeof room.adminUser === 'string' || typeof room.adminUser === 'number'
        ? String(room.adminUser)
        : (room.ownerId ? String(room.ownerId) : ''));

  const isAdmin = currentUserIdStr && adminIdStr && currentUserIdStr === adminIdStr;

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchEligibleUsers(q);
      // Filter out users already in room
      const existingIds = new Set((room.participants || []).map((p) => String(p.id)));
      setSearchResults(results.filter((u) => !existingIds.has(String(u.id))));
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
    } else {
      setIsSearching(true);
      debouncedSearch(val);
    }
  };

  const handleAddMember = async (targetUser: SearchableUser) => {
    setActionError(null);
    setActionSuccess(null);
    setLoadingUserId(targetUser.id);
    const res = await addMemberToRoom(room.id, targetUser.id);
    setLoadingUserId(null);
    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess(`${targetUser.username} wurde zur Gruppe hinzugefügt.`);
      setSearchResults((prev) => prev.filter((u) => String(u.id) !== String(targetUser.id)));
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleRemoveMember = async (participantId: string, participantName: string) => {
    if (!confirm(`${participantName} wirklich aus der Gruppe entfernen?`)) return;
    setActionError(null);
    setActionSuccess(null);
    setLoadingUserId(participantId);
    const res = await removeMemberFromRoom(room.id, participantId);
    setLoadingUserId(null);
    if (res.error) {
      setActionError(res.error);
    } else {
      setActionSuccess(`${participantName} wurde entfernt.`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-subtle rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">{room.name}</h3>
              <p className="text-xs text-muted">
                {room.participants?.length || 0} Mitglieder • {isAdmin ? 'Du bist Admin' : 'Mitglied'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-xl text-muted hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {actionError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Section: Current Members */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
              Mitglieder ({room.participants?.length || 0})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(room.participants || []).map((p) => {
                const isMemberAdmin = String(p.id) === adminIdStr;
                const isSelf = String(p.id) === currentUserIdStr;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-surface border border-subtle rounded-2xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center font-bold text-xs text-primary border border-subtle shrink-0 overflow-hidden">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.username} className="w-full h-full object-cover" />
                        ) : (
                          p.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-primary truncate flex items-center gap-1.5">
                          <span className="truncate">{p.username}</span>
                          {isSelf && <span className="text-[10px] text-muted font-normal">(Du)</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberAdmin && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-semibold rounded-full flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          <span>Admin</span>
                        </span>
                      )}

                      {isAdmin && !isMemberAdmin && !isSelf && (
                        <button
                          onClick={() => handleRemoveMember(String(p.id), p.username)}
                          disabled={loadingUserId === p.id}
                          className="p-1.5 hover:bg-rose-500/20 text-muted hover:text-rose-300 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                          title="Mitglied aus Gruppe entfernen"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Add Members (Admin Only) */}
          {isAdmin ? (
            <div className="space-y-3 pt-3 border-t border-subtle">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Neues Mitglied hinzufügen</span>
              </h4>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Nach Nutzern suchen..."
                  className="w-full bg-surface border border-subtle rounded-xl pl-10 pr-4 py-2 text-xs text-primary placeholder-faint focus:outline-none focus:border-indigo-500"
                />
              </div>

              {isSearching && (
                <div className="text-xs text-muted text-center py-2 animate-pulse">
                  Suche nach Nutzern...
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 bg-surface hover:bg-surface-raised border border-subtle rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center font-bold text-xs text-primary border border-subtle shrink-0 overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-medium text-primary truncate">{user.username}</span>
                    </div>

                    <button
                      onClick={() => handleAddMember(user)}
                      disabled={loadingUserId === user.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Hinzufügen</span>
                    </button>
                  </div>
                ))}

                {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                  <div className="text-xs text-muted text-center py-3">
                    Keine passenden Nutzer gefunden.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-surface border border-subtle rounded-2xl text-xs text-muted text-center">
              Nur der Gruppen-Admin kann neue Mitglieder hinzufügen oder entfernen.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
