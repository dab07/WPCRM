 'use client';

import { useState, useEffect } from 'react';
import { 
  Instagram, 
  Settings, 
  Plus, 
  Play,
  Pause
} from 'lucide-react';
import { supabase } from '../../../supabase/supabase';

interface SocialMediaAccount {
  id: string;
  platform: string;
  account_id: string;
  account_username: string;
  is_active: boolean;
  created_at: string;
}

interface BroadcastRule {
  id: string;
  name: string;
  account_id: string;
  post_type: 'reel' | 'post' | 'story';
  target_contact_tags: string[];
  hashtag_filters: string[];
  message_template: string;
  ai_context_prompt: string;
  is_active: boolean;
}

export function InstagramIntegration() {
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [broadcastRules, setBroadcastRules] = useState<BroadcastRule[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);

  const [newAccount, setNewAccount] = useState({
    account_username: '',
    account_id: '',
    access_token: ''
  });

  const [newRule, setNewRule] = useState({
    name: '',
    account_id: '',
    post_type: 'reel' as 'reel' | 'post' | 'story',
    target_contact_tags: '',
    hashtag_filters: '',
    message_template: 'Check out our latest reel! {name} 🎬 {reel_url}',
    ai_context_prompt: 'Generate a brief 20-30 word message about this Instagram reel to share with customers'
  });

  useEffect(() => {
    loadAccounts();
    loadBroadcastRules();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('platform', 'instagram')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadBroadcastRules = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_broadcast_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcastRules(data || []);
    } catch (error) {
      console.error('Error loading broadcast rules:', error);
    }
  };

  const addAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_accounts')
        .insert({
          platform: 'instagram',
          account_id: newAccount.account_id,
          account_username: newAccount.account_username,
          access_token: newAccount.access_token,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setAccounts([data, ...accounts]);
      setNewAccount({ account_username: '', account_id: '', access_token: '' });
      setIsAddingAccount(false);
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const addBroadcastRule = async () => {
    try {
      const { data, error } = await supabase
        .from('instagram_broadcast_rules')
        .insert({
          name: newRule.name,
          account_id: newRule.account_id,
          post_type: newRule.post_type,
          target_contact_tags: newRule.target_contact_tags.split(',').map(tag => tag.trim()).filter(Boolean),
          hashtag_filters: newRule.hashtag_filters.split(',').map(tag => tag.trim()).filter(Boolean),
          message_template: newRule.message_template,
          ai_context_prompt: newRule.ai_context_prompt,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setBroadcastRules([data, ...broadcastRules]);
      setNewRule({
        name: '',
        account_id: '',
        post_type: 'reel',
        target_contact_tags: '',
        hashtag_filters: '',
        message_template: 'Check out our latest reel! {name} 🎬 {reel_url}',
        ai_context_prompt: 'Generate a brief 20-30 word message about this Instagram reel to share with customers'
      });
      setIsAddingRule(false);
    } catch (error) {
      console.error('Error adding broadcast rule:', error);
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('instagram_broadcast_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId);

      if (error) throw error;
      
      setBroadcastRules(rules => 
        rules.map(rule => 
          rule.id === ruleId ? { ...rule, is_active: !isActive } : rule
        )
      );
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Instagram className="w-8 h-8 text-pink-600" />
            Instagram Integration
          </h1>
          <p className="text-slate-600 mt-1">
            Automatically share Instagram reels with your WhatsApp contacts
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddingAccount(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Instagram Accounts */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Connected Accounts</h3>
        </div>
        <div className="p-6">
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div key={account.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">@{account.account_username}</h4>
                    <div className={`w-2 h-2 rounded-full ${
                      account.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    ID: {account.account_id}
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAddingRule(true)}
                      className="flex-1 px-3 py-1 text-sm bg-pink-100 text-pink-600 rounded hover:bg-pink-200 transition-colors"
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Instagram className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No Instagram accounts connected</p>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Rules */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Broadcast Rules</h3>
          <button
            onClick={() => setIsAddingRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
        <div className="p-6">
          {broadcastRules.length > 0 ? (
            <div className="space-y-4">
              {broadcastRules.map((rule) => (
                <div key={rule.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{rule.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rule.post_type === 'reel' ? 'bg-purple-100 text-purple-600' :
                        rule.post_type === 'post' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {rule.post_type}
                      </span>
                      <button
                        onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                        className={`p-1 rounded ${
                          rule.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {rule.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><strong>Target Tags:</strong> {rule.target_contact_tags.join(', ') || 'All contacts'}</p>
                    <p><strong>Hashtag Filters:</strong> {rule.hashtag_filters.join(', ') || 'All posts'}</p>
                    <p><strong>Message:</strong> {rule.message_template}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No broadcast rules configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Add Instagram Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newAccount.account_username}
                  onChange={(e) => setNewAccount({ ...newAccount, account_username: e.target.value })}
                  placeholder="@yourusername"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  value={newAccount.account_id}
                  onChange={(e) => setNewAccount({ ...newAccount, account_id: e.target.value })}
                  placeholder="Instagram account ID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={newAccount.access_token}
                  onChange={(e) => setNewAccount({ ...newAccount, access_token: e.target.value })}
                  placeholder="Instagram API access token"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddingAccount(false)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addAccount}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Add Broadcast Rule</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., Reel Notifications for VIP Customers"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instagram Account
                </label>
                <select
                  value={newRule.account_id}
                  onChange={(e) => setNewRule({ ...newRule, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      @{account.account_username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Post Type
                </label>
                <select
                  value={newRule.post_type}
                  onChange={(e) => setNewRule({ ...newRule, post_type: e.target.value as 'reel' | 'post' | 'story' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="reel">Reels</option>
                  <option value="post">Posts</option>
                  <option value="story">Stories</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Contact Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newRule.target_contact_tags}
                  onChange={(e) => setNewRule({ ...newRule, target_contact_tags: e.target.value })}
                  placeholder="vip, customers, leads (leave empty for all contacts)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hashtag Filters (comma-separated)
                </label>
                <input
                  type="text"
                  value={newRule.hashtag_filters}
                  onChange={(e) => setNewRule({ ...newRule, hashtag_filters: e.target.value })}
                  placeholder="#business, #tips (leave empty for all posts)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message Template
                </label>
                <textarea
                  value={newRule.message_template}
                  onChange={(e) => setNewRule({ ...newRule, message_template: e.target.value })}
                  placeholder="Use {name} for contact name, {reel_url} for reel link"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AI Context Prompt
                </label>
                <textarea
                  value={newRule.ai_context_prompt}
                  onChange={(e) => setNewRule({ ...newRule, ai_context_prompt: e.target.value })}
                  placeholder="Instructions for AI to generate contextual message"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddingRule(false)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addBroadcastRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}