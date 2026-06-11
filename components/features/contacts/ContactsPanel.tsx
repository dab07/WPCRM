'use client';

import { useEffect, useState } from 'react';
import { Search, User, Mail, Building2, Tag, Plus } from 'lucide-react';

import { useContacts } from '../../../lib/hooks';
import { LoadingSpinner } from '../../ui';
import { AddContactModal } from './AddContactModal';
import type { Contact } from '../../../lib/types/api/contacts';

export function ContactsPanel() {
  const { contacts, loading, updateContact, reload } = useContacts();
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => { setFilteredContacts(contacts); }, [contacts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone_number.includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinner message="Loading contacts..." />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-brand-navy">
      {/* ── Left: Contact list ── */}
      <div className="w-80 shrink-0 border-r border-[rgba(59,91,173,0.18)] flex flex-col bg-brand-navy">
        {/* List header */}
        <div className="px-5 py-4 border-b border-[rgba(59,91,173,0.18)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="label-eyebrow text-brand-muted mb-0.5">Directory</p>
              <h2 className="font-heading font-semibold text-brand-offwhite tracking-tight">
                Contacts
              </h2>
            </div>
            <button
              onClick={() => setShowAddContact(true)}
              className="
                w-8 h-8 bg-brand-yellow hover:brightness-110 text-brand-navy
                rounded-[4px] flex items-center justify-center transition-all hover:-translate-y-0.5
              "
              aria-label="Add contact"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[1.5] text-brand-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="
                w-full pl-9 pr-3 py-2 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]
                font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50
                focus:outline-none focus:border-brand-yellow transition-colors
              "
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-muted gap-3">
              <div className="w-12 h-12 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] flex items-center justify-center">
                <User className="w-6 h-6 stroke-[1.5] text-brand-blue" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-label">No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(59,91,173,0.12)]">
              {filteredContacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContact?.id === contact.id}
                  onSelect={setSelectedContact}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Detail panel ── */}
      <div className="flex-1 overflow-y-auto">
        {selectedContact ? (
          <ContactDetails
            contact={selectedContact}
            onUpdate={reload}
            updateContact={updateContact}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-brand-muted gap-4">
            <div className="w-16 h-16 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] flex items-center justify-center">
              <User className="w-8 h-8 stroke-[1.5] text-brand-blue" />
            </div>
            <div className="text-center">
              <p className="font-heading font-semibold text-brand-offwhite text-sm">Select a contact</p>
              <p className="font-mono text-[11px] uppercase tracking-label text-brand-muted mt-1">
                Details will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSuccess={reload}
      />
    </div>
  );
}

/* ── List item ─────────────────────────────────────────────────────────────── */
function ContactListItem({
  contact,
  isSelected,
  onSelect,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: (c: Contact) => void;
}) {
  return (
    <button
      onClick={() => onSelect(contact)}
      className={`
        w-full p-4 text-left transition-all duration-150
        border-l-2
        ${isSelected
          ? 'bg-brand-blue/20 border-brand-yellow'
          : 'border-transparent hover:bg-brand-slate'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-brand-blue/20 border border-brand-blue/30 rounded-[4px] flex items-center justify-center shrink-0">
          <User className="w-4 h-4 stroke-[1.5] text-brand-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-brand-offwhite text-[13px] truncate">
            {contact.name}
          </p>
          <p className="font-mono text-[10px] text-brand-muted truncate">{contact.phone_number}</p>
          {contact.company && (
            <p className="font-body text-[12px] text-brand-muted/70 truncate mt-0.5">
              {contact.company}
            </p>
          )}
          {contact.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {contact.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[9px] uppercase tracking-label px-1.5 py-0.5 border border-[rgba(59,91,173,0.18)] text-brand-muted rounded-[4px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Detail panel ──────────────────────────────────────────────────────────── */
function ContactDetails({
  contact,
  onUpdate,
  updateContact,
}: {
  contact: Contact;
  onUpdate: () => void;
  updateContact: (id: string, updates: any) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: contact.name,
    email: contact.email || '',
    company: contact.company || '',
    tags: contact.tags.join(', '),
  });

  const handleSave = async () => {
    try {
      await updateContact(contact.id, {
        name: formData.name,
        ...(formData.email.trim() && { email: formData.email }),
        ...(formData.company.trim() && { company: formData.company }),
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  /* field helper */
  const fieldCls =
    'w-full px-3 py-2.5 bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px] font-body text-[13px] text-brand-offwhite placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-yellow transition-colors';

  return (
    <div className="p-6 max-w-2xl">
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="label-eyebrow text-brand-muted mb-0.5">Contact Profile</p>
          <h2 className="font-display font-bold text-brand-offwhite text-[22px] tracking-tighter">
            Contact Details
          </h2>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-[11px] uppercase tracking-label text-brand-blue hover:text-brand-yellow border border-brand-blue/40 hover:border-brand-yellow px-3 py-1.5 rounded-[4px] transition-all"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="font-mono text-[11px] uppercase tracking-label text-brand-muted border border-[rgba(59,91,173,0.18)] px-3 py-1.5 rounded-[4px] hover:border-brand-muted/60 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="font-mono text-[11px] uppercase tracking-label bg-brand-yellow text-brand-navy px-3 py-1.5 rounded-[4px] hover:brightness-110 hover:-translate-y-0.5 transition-all"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-brand-blue/20 border border-brand-blue/30 rounded-[4px] flex items-center justify-center shrink-0">
          <User className="w-7 h-7 stroke-[1.5] text-brand-blue" />
        </div>
        <div>
          {editing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`${fieldCls} text-base font-semibold w-64`}
            />
          ) : (
            <h3 className="font-heading font-semibold text-brand-offwhite text-lg">{contact.name}</h3>
          )}
          <p className="font-mono text-[11px] text-brand-muted mt-0.5">{contact.phone_number}</p>
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
            <Mail className="w-3.5 h-3.5 stroke-[1.5]" /> Email
          </label>
          {editing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={fieldCls}
              placeholder="email@example.com"
            />
          ) : (
            <p className="font-body text-[13px] text-brand-offwhite">
              {contact.email || <span className="text-brand-muted">Not provided</span>}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
            <Building2 className="w-3.5 h-3.5 stroke-[1.5]" /> Company
          </label>
          {editing ? (
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className={fieldCls}
              placeholder="Company name"
            />
          ) : (
            <p className="font-body text-[13px] text-brand-offwhite">
              {contact.company || <span className="text-brand-muted">Not provided</span>}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-brand-muted mb-2">
          <Tag className="w-3.5 h-3.5 stroke-[1.5]" /> Tags
        </label>
        {editing ? (
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className={fieldCls}
            placeholder="tag1, tag2, tag3"
          />
        ) : (
          <div className="flex gap-2 flex-wrap">
            {contact.tags.length > 0 ? (
              contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] uppercase tracking-label px-2.5 py-1 border border-brand-blue/40 text-brand-blue bg-brand-blue/10 rounded-[4px]"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="font-mono text-[11px] text-brand-muted">No tags</span>
            )}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="pt-5 border-t border-[rgba(59,91,173,0.18)]">
        <div className="flex gap-6">
          <div>
            <p className="label-eyebrow text-brand-muted mb-0.5">Source</p>
            <p className="font-heading font-medium text-brand-offwhite text-[13px]">
              {contact.source}
            </p>
          </div>
          <div>
            <p className="label-eyebrow text-brand-muted mb-0.5">Added</p>
            <p className="font-heading font-medium text-brand-offwhite text-[13px]">
              {new Date(contact.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
