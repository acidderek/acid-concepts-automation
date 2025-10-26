import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ModernRedditSettings = ({ user, setMessage, checkDatabase, startRedditAuth, redditAuthStatus }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    username: '',
    clientId: '',
    clientSecret: '',
    description: '',
    tags: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Load saved Reddit accounts
  const loadAccounts = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'reddit')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw API keys data:', data);

      // Group by account username (reddit username)
      const groupedAccounts = {};
      data?.forEach(key => {
        console.log('Processing key:', key);
        const username = key.account_alias || 'unknown';
        if (!groupedAccounts[username]) {
          groupedAccounts[username] = {
            username,
            description: key.account_description || '',
            tags: key.tags || '',
            status: 'disconnected',
            created_at: key.created_at,
            keys: {}
          };
        }
        groupedAccounts[username].keys[key.key_type] = key.key_value;
      });

      console.log('Grouped accounts:', groupedAccounts);
      setAccounts(Object.values(groupedAccounts));
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  // Save new account
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setMessage('Saving Reddit account...');

      // Save Client ID
      const { error: idError } = await supabase.from('api_keys_2025_10_25_19_00').upsert({
        user_id: user.id,
        platform: 'reddit',
        key_type: 'client_id',
        key_name: 'Reddit Client ID',
        key_value: newAccount.clientId,
        account_alias: newAccount.username,
        account_description: newAccount.description,
        tags: newAccount.tags,
        is_valid: true
      });

      if (idError) throw idError;

      // Save Client Secret
      const { error: secretError } = await supabase.from('api_keys_2025_10_25_19_00').upsert({
        user_id: user.id,
        platform: 'reddit',
        key_type: 'client_secret',
        key_name: 'Reddit Client Secret',
        key_value: newAccount.clientSecret,
        account_alias: newAccount.username,
        account_description: newAccount.description,
        tags: newAccount.tags,
        is_valid: true
      });

      if (secretError) throw secretError;

      // Save Callback URL
      const callbackUrl = `${window.location.origin}/auth/reddit/callback`;
      const { error: callbackError } = await supabase.from('api_keys_2025_10_25_19_00').upsert({
        user_id: user.id,
        platform: 'reddit',
        key_type: 'callback_url',
        key_name: 'Reddit Callback URL',
        key_value: callbackUrl,
        account_alias: newAccount.username,
        account_description: newAccount.description,
        tags: newAccount.tags,
        callback_url: callbackUrl,
        is_valid: true
      });

      if (callbackError) throw callbackError;

      setMessage(`✅ Reddit account u/${newAccount.username} saved! (3 keys: Client ID, Secret, Callback URL)`);
      setNewAccount({ username: '', clientId: '', clientSecret: '', description: '', tags: '' });
      setShowAddForm(false);
      loadAccounts();
    } catch (error) {
      setMessage(`❌ Failed to save account: ${error.message}`);
    }
  };

  // Delete account
  const handleDeleteAccount = async (username) => {
    if (!user?.id) return;
    if (!confirm(`Delete Reddit account u/${username}? This will remove all associated keys.`)) return;

    try {
      setMessage('Deleting Reddit account...');

      // Handle the case where username is 'unknown' (meaning account_alias is null)
      let query = supabase
        .from('api_keys_2025_10_25_19_00')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'reddit');

      if (username === 'unknown') {
        query = query.is('account_alias', null);
      } else {
        query = query.eq('account_alias', username);
      }

      const { data: deleteResult, error } = await query.select();

      console.log('Delete result:', deleteResult);
      console.log('Delete error:', error);

      if (error) throw error;

      setMessage(`✅ Reddit account u/${username} deleted successfully! (${deleteResult?.length || 0} records removed)`);
      
      // Force reload accounts immediately
      await loadAccounts();
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setMessage(`❌ Failed to delete account: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [user?.id]);

  // Filter accounts based on search and tag filter
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !filterTag || account.tags.toLowerCase().includes(filterTag.toLowerCase());
    return matchesSearch && matchesTag;
  });

  // Get unique tags for filter dropdown
  const allTags = [...new Set(accounts.flatMap(account => 
    account.tags ? account.tags.split(',').map(tag => tag.trim()) : []
  ))].filter(Boolean);

  const AccountTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Reddit Username</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Tags</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Created</th>
            <th className="px-3 py-2 text-center font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredAccounts.map((account, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div>
                  <div className="font-medium text-gray-900">u/{account.username}</div>
                  <div className="text-xs text-gray-500">{account.description}</div>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {account.tags && account.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  account.status === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {account.status === 'connected' ? '✅ Connected' : '❌ Disconnected'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {new Date(account.created_at).toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-center space-x-1">
                  <button
                    onClick={() => setSelectedAccount(account)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    title="View Details"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => startRedditAuth()}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Connect Account"
                  >
                    🔗
                  </button>
                  <button
                    onClick={checkDatabase}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    title="Check Status"
                  >
                    🔍
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.username)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                    title="Delete Account"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const AccountCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredAccounts.map((account, index) => (
        <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-gray-900">u/{account.username}</h4>
              <p className="text-xs text-gray-500">{account.description}</p>
            </div>
            <span className={`w-3 h-3 rounded-full ${
              account.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </div>
          
          {/* Tags */}
          {account.tags && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {account.tags.split(',').map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mb-3">
            Created: {new Date(account.created_at).toLocaleDateString()}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setSelectedAccount(account)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Details
            </button>
            <div className="flex space-x-1">
              <button
                onClick={() => startRedditAuth()}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Connect"
              >
                🔗
              </button>
              <button
                onClick={checkDatabase}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                title="Check"
              >
                🔍
              </button>
              <button
                onClick={() => handleDeleteAccount(account.username)}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reddit Accounts</h3>
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'table' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Table
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'card' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗃️ Cards
            </button>
          </div>
          
          {/* Add Account Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="🔍 Search accounts by username or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="min-w-32">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        {(searchTerm || filterTag) && (
          <button
            onClick={() => {setSearchTerm(''); setFilterTag('');}}
            className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 border rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <form onSubmit={handleSaveAccount} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Reddit username (e.g., Feisty_Individual_89)"
                value={newAccount.username}
                onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                className="px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Tags (comma-separated: work, main, bot)"
                value={newAccount.tags}
                onChange={(e) => setNewAccount({...newAccount, tags: e.target.value})}
                className="px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newAccount.description}
                onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Reddit Client ID"
                value={newAccount.clientId}
                onChange={(e) => setNewAccount({...newAccount, clientId: e.target.value})}
                className="px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Reddit Client Secret"
                value={newAccount.clientSecret}
                onChange={(e) => setNewAccount({...newAccount, clientSecret: e.target.value})}
                className="px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No Reddit accounts configured</p>
          <p className="text-xs mt-1">Click "Add Account" to get started</p>
        </div>
      ) : (
        viewMode === 'table' ? <AccountTableView /> : <AccountCardView />
      )}

      {/* Account Details Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Account Details</h4>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Reddit Username</label>
                <p className="text-sm text-gray-900">u/{selectedAccount.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAccount.tags ? selectedAccount.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  )) : <span className="text-sm text-gray-500">No tags</span>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedAccount.description || 'No description'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="text-sm text-gray-900">{selectedAccount.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Configured Keys</label>
                <div className="text-sm text-gray-900">
                  {Object.keys(selectedAccount.keys).map(keyType => (
                    <div key={keyType} className="flex justify-between">
                      <span>{keyType}:</span>
                      <span className="text-green-600">✓</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Callback URL</label>
                <p className="text-xs text-gray-600 break-all">
                  {window.location.origin}/auth/reddit/callback
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernRedditSettings;