import { useEffect, useState } from 'react';
import { api, Contact } from '../lib/api';
import { Search, User, Mail, Building2, Tag, Plus } from 'lucide-react';
import { AddContactModal } from './Contacts/AddContactModal';

export function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone_number.includes(searchQuery) ||
          contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      const data = await api.get('/contacts');
      setContacts(data || []);
      setFilteredContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
            <button
              onClick={() => setShowAddContact(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
              <User className="w-12 h-12 mb-2" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                      <p className="text-sm text-slate-500 truncate">{contact.phone_number}</p>
                      {contact.company && (
                        <p className="text-sm text-slate-600 truncate mt-1">{contact.company}</p>
                      )}
                      {contact.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedContact ? (
          <ContactDetails contact={selectedContact} onUpdate={loadContacts} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <User className="w-16 h-16 mx-auto mb-4" />
              <p>Select a contact to view details</p>
            </div>
          </div>
        )}
      </div>

      <AddContactModal 
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)} 
        onSuccess={loadContacts} 
      />
    </div>
  );
}

function ContactDetails({
  contact,
  onUpdate,
}: {
  contact: Contact;
  onUpdate: () => void;
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
      await api.put(`/contacts/${contact.id}`, {
        name: formData.name,
        email: formData.email || null,
        company: formData.company || null,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      });
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Contact Details</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xl font-semibold border border-slate-300 rounded px-2 py-1"
              />
            ) : (
              <h3 className="text-xl font-semibold text-slate-900">{contact.name}</h3>
            )}
            <p className="text-slate-500">{contact.phone_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Email</span>
            </div>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="email@example.com"
              />
            ) : (
              <p className="text-slate-900">{contact.email || 'Not provided'}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Company</span>
            </div>
            {editing ? (
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="Company name"
              />
            ) : (
              <p className="text-slate-900">{contact.company || 'Not provided'}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium">Tags</span>
          </div>
          {editing ? (
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="tag1, tag2, tag3"
            />
          ) : (
            <div className="flex gap-2 flex-wrap">
              {contact.tags.length > 0 ? (
                contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">No tags</span>
              )}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Source: <span className="font-medium text-slate-700">{contact.source}</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Added: {new Date(contact.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// Old AddContactModal removed - now using the new one from ./Contacts/AddContactModal
