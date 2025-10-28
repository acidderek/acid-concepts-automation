import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface APIKeySettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

interface APIKey {
  id: string;
  service: string;
  key_name: string;
  key_value: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const APIKeySettings: React.FC<APIKeySettingsProps> = ({ user, setMessage }) => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    service: '',
    key_name: '',
    key_value: ''
  });
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});

  // Bucket management state
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [bucketSettings, setBucketSettings] = useState({
    region: 'us-east-1',
    endpoint: 's3.wasabisys.com',
    defaultBucket: ''
  });

  const predefinedServices = [
    { value: 'openai', label: '🤖 OpenAI', testable: true },
    { value: 'openrouter', label: '🔀 OpenRouter', testable: true },
    { value: 'wasabi_access', label: '☁️ Wasabi Access Key', testable: false },
    { value: 'wasabi_secret', label: '🔐 Wasabi Secret Key', testable: false },
    { value: 'wasabi_bucket', label: '🪣 Wasabi Bucket Name', testable: false },
    { value: 'stripe', label: '💳 Stripe', testable: false },
    { value: 'resend', label: '📧 Resend', testable: false },
    { value: 'custom', label: '🔧 Custom', testable: false }
  ];

  useEffect(() => {
    loadApiKeys();
    loadBuckets();
    loadBucketSettings();
  }, [user]);

  const loadApiKeys = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading API keys for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('API keys query result:', { data, error });

      if (error) {
        console.error('Error loading API keys:', error);
        setMessage(`❌ Failed to load API keys: ${error.message}`);
        return;
      }

      console.log('Loaded API keys:', data);
      setApiKeys(data || []);
      
      if (data && data.length > 0) {
        setMessage(`✅ Loaded ${data.length} API keys`);
      }
    } catch (error) {
      console.error('Exception loading API keys:', error);
      setMessage('❌ Error loading API keys');
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setMessage('🔄 Cleaning up duplicate API keys...');

      // Get all API keys for this user
      const { data: allKeys, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching keys for cleanup:', fetchError);
        return;
      }

      if (!allKeys || allKeys.length === 0) return;

      // Group by service and keep only the most recent one
      const serviceGroups: { [key: string]: APIKey[] } = {};
      allKeys.forEach(key => {
        if (!serviceGroups[key.service]) {
          serviceGroups[key.service] = [];
        }
        serviceGroups[key.service].push(key);
      });

      let duplicatesRemoved = 0;

      // For each service, keep the most recent and delete the rest
      for (const [service, keys] of Object.entries(serviceGroups)) {
        if (keys.length > 1) {
          // Keep the first one (most recent due to our ordering) and delete the rest
          const toDelete = keys.slice(1);
          
          for (const key of toDelete) {
            const { error: deleteError } = await supabase
              .from('user_api_keys')
              .delete()
              .eq('id', key.id);

            if (!deleteError) {
              duplicatesRemoved++;
            }
          }
        }
      }

      if (duplicatesRemoved > 0) {
        setMessage(`✅ Removed ${duplicatesRemoved} duplicate API keys`);
        await loadApiKeys(); // Reload to show cleaned data
      } else {
        setMessage('✅ No duplicates found');
      }

    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      setMessage('❌ Error cleaning up duplicates');
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newKey.service || !newKey.key_name || !newKey.key_value) {
      setMessage('❌ Please fill in all fields');
      return;
    }

    if (!user?.id) {
      setMessage('❌ Please log in to add API keys');
      return;
    }

    try {
      setLoading(true);
      console.log('Adding API key:', { 
        user_id: user.id, 
        service: newKey.service, 
        key_name: newKey.key_name 
      });
      
      // First, delete any existing entries for this service to prevent duplicates
      const { error: deleteError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('service', newKey.service);

      if (deleteError) {
        console.log('Note: Could not delete existing entries:', deleteError);
      }

      // Now insert the new key
      const { data, error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          service: newKey.service,
          key_name: newKey.key_name,
          key_value: newKey.key_value,
          status: 'active'
        })
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Error adding API key:', error);
        setMessage(`❌ Failed to add API key: ${error.message}`);
        return;
      }

      setMessage('✅ API key added successfully');
      setNewKey({ service: '', key_name: '', key_value: '' });
      setShowAddForm(false);
      await loadApiKeys(); // Reload to show new key
    } catch (error) {
      console.error('Exception adding API key:', error);
      setMessage('❌ Error adding API key');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: string, keyName: string) => {
    if (!confirm(`Delete "${keyName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting API key:', error);
        setMessage('❌ Failed to delete API key');
        return;
      }

      setMessage('✅ API key deleted successfully');
      loadApiKeys();
    } catch (error) {
      console.error('Exception deleting API key:', error);
      setMessage('❌ Error deleting API key');
    } finally {
      setLoading(false);
    }
  };

  const testApiKey = async (apiKey: APIKey) => {
    setTesting(prev => ({ ...prev, [apiKey.id]: true }));
    setMessage(`🔄 Testing ${apiKey.key_name}...`);

    try {
      let testUrl = '';
      let headers: any = {
        'Content-Type': 'application/json'
      };

      if (apiKey.service === 'openai') {
        testUrl = 'https://api.openai.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey.key_value}`;
      } else if (apiKey.service === 'openrouter') {
        testUrl = 'https://openrouter.ai/api/v1/models';
        headers['Authorization'] = `Bearer ${apiKey.key_value}`;
      } else {
        setMessage('❌ Testing not supported for this service');
        return;
      }

      const response = await fetch(testUrl, { headers });
      
      if (response.ok) {
        setMessage(`✅ ${apiKey.key_name} connection successful!`);
      } else {
        setMessage(`❌ ${apiKey.key_name} connection failed`);
      }
    } catch (error) {
      setMessage(`❌ ${apiKey.key_name} connection error`);
    } finally {
      setTesting(prev => ({ ...prev, [apiKey.id]: false }));
    }
  };

  const maskKey = (key: string) => {
    if (!key) return 'Not set';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const getServiceLabel = (service: string) => {
    const found = predefinedServices.find(s => s.value === service);
    return found ? found.label : `🔧 ${service}`;
  };

  const isTestable = (service: string) => {
    const found = predefinedServices.find(s => s.value === service);
    return found ? found.testable : false;
  };

  const loadBuckets = async () => {
    try {
      setLoadingBuckets(true);
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error loading buckets:', error);
        setMessage('❌ Failed to load storage buckets');
        return;
      }

      // Get bucket details with file counts
      const bucketsWithDetails = await Promise.all(
        data.map(async (bucket) => {
          try {
            const { data: files, error: filesError } = await supabase.storage
              .from(bucket.name)
              .list('', { limit: 1000 });

            let fileCount = 0;
            if (!filesError && files) {
              fileCount = files.length;
            }

            return {
              id: bucket.id,
              name: bucket.name,
              created: new Date(bucket.created_at).toLocaleDateString(),
              files: fileCount,
              size: fileCount > 0 ? `${fileCount} files` : '0 files',
              status: bucket.public ? 'public' : 'private',
              public: bucket.public
            };
          } catch (err) {
            return {
              id: bucket.id,
              name: bucket.name,
              created: new Date(bucket.created_at).toLocaleDateString(),
              files: 0,
              size: '0 files',
              status: bucket.public ? 'public' : 'private',
              public: bucket.public
            };
          }
        })
      );

      setBuckets(bucketsWithDetails);
    } catch (error) {
      console.error('Exception loading buckets:', error);
      setMessage('❌ Error loading storage buckets');
    } finally {
      setLoadingBuckets(false);
    }
  };

  const loadBucketSettings = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .in('service', ['wasabi_region', 'wasabi_endpoint', 'wasabi_bucket']);

      if (error) {
        console.error('Error loading bucket settings:', error);
        return;
      }

      const settings = { ...bucketSettings };
      data?.forEach(item => {
        if (item.service === 'wasabi_region') settings.region = item.key_value;
        if (item.service === 'wasabi_endpoint') settings.endpoint = item.key_value;
        if (item.service === 'wasabi_bucket') settings.defaultBucket = item.key_value;
      });

      setBucketSettings(settings);
    } catch (error) {
      console.error('Exception loading bucket settings:', error);
    }
  };

  const saveBucketSettings = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in to save bucket settings');
      return;
    }

    try {
      setLoadingBuckets(true);

      // Save region
      await supabase.from('user_api_keys').upsert({
        user_id: user.id,
        service: 'wasabi_region',
        key_name: 'Wasabi Region',
        key_value: bucketSettings.region,
        status: 'active'
      });

      // Save endpoint
      await supabase.from('user_api_keys').upsert({
        user_id: user.id,
        service: 'wasabi_endpoint',
        key_name: 'Wasabi Endpoint',
        key_value: bucketSettings.endpoint,
        status: 'active'
      });

      // Save default bucket
      if (bucketSettings.defaultBucket) {
        await supabase.from('user_api_keys').upsert({
          user_id: user.id,
          service: 'wasabi_bucket',
          key_name: 'Default Bucket',
          key_value: bucketSettings.defaultBucket,
          status: 'active'
        });
      }

      setMessage('✅ Bucket settings saved successfully');
      await loadApiKeys(); // Refresh API keys table
    } catch (error) {
      console.error('Exception saving bucket settings:', error);
      setMessage('❌ Error saving bucket settings');
    } finally {
      setLoadingBuckets(false);
    }
  };

  const createBucket = async () => {
    if (!newBucketName.trim()) {
      setMessage('❌ Please enter a bucket name');
      return;
    }

    try {
      setLoadingBuckets(true);
      const bucketName = newBucketName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 52428800 // 50MB
      });

      if (error) {
        console.error('Error creating bucket:', error);
        setMessage(`❌ Failed to create bucket: ${error.message}`);
        return;
      }

      setNewBucketName('');
      setShowCreateBucket(false);
      setMessage(`✅ Bucket "${bucketName}" created successfully`);
      
      // Reload buckets to show the new one
      loadBuckets();
    } catch (error: any) {
      console.error('Exception creating bucket:', error);
      setMessage(`❌ Error creating bucket: ${error.message}`);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const deleteBucket = async (bucketName: string) => {
    if (!confirm(`Are you sure you want to delete bucket "${bucketName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoadingBuckets(true);
      
      const { error } = await supabase.storage.deleteBucket(bucketName);
      
      if (error) {
        console.error('Error deleting bucket:', error);
        setMessage(`❌ Failed to delete bucket: ${error.message}`);
        return;
      }

      setMessage(`✅ Bucket "${bucketName}" deleted successfully`);
      
      // Reload buckets to remove the deleted one
      loadBuckets();
    } catch (error: any) {
      console.error('Exception deleting bucket:', error);
      setMessage(`❌ Error deleting bucket: ${error.message}`);
    } finally {
      setLoadingBuckets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
        <strong>Debug Info:</strong> User ID: {user?.id || 'Not logged in'} | 
        API Keys Count: {apiKeys.length} | 
        Loading: {loading ? 'Yes' : 'No'}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">🔑 API Keys Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ➕ Add API Key
          </button>
          <button
            onClick={cleanupDuplicates}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? '🔄 Cleaning...' : '🧹 Remove Duplicates'}
          </button>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            Loading API keys...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">🔑</div>
                    <p className="text-lg font-medium mb-2">No API Keys</p>
                    <p className="text-sm">Add your first API key to get started.</p>
                  </td>
                </tr>
              ) : (
                apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getServiceLabel(apiKey.service)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{apiKey.key_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {maskKey(apiKey.key_value)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        apiKey.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {apiKey.status === 'active' ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {isTestable(apiKey.service) && (
                        <button
                          onClick={() => testApiKey(apiKey)}
                          disabled={testing[apiKey.id]}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {testing[apiKey.id] ? '⏳' : '🧪'} Test
                        </button>
                      )}
                      <button
                        onClick={() => deleteApiKey(apiKey.id, apiKey.key_name)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Bucket Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🪣 Storage Bucket Settings</h3>
          <button
            onClick={() => setShowCreateBucket(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ➕ Create Bucket
          </button>
        </div>

        {/* Bucket Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <input
              type="text"
              value={bucketSettings.region}
              onChange={(e) => setBucketSettings(prev => ({ ...prev, region: e.target.value }))}
              placeholder="us-east-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint
            </label>
            <input
              type="text"
              value={bucketSettings.endpoint}
              onChange={(e) => setBucketSettings(prev => ({ ...prev, endpoint: e.target.value }))}
              placeholder="s3.wasabisys.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Bucket Name
            </label>
            <input
              type="text"
              value={bucketSettings.defaultBucket}
              onChange={(e) => setBucketSettings(prev => ({ ...prev, defaultBucket: e.target.value }))}
              placeholder="my-default-bucket"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={saveBucketSettings}
            disabled={loadingBuckets}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loadingBuckets ? '⏳ Saving...' : '💾 Save Bucket Settings'}
          </button>
        </div>

        {/* Buckets Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bucket Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingBuckets ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading buckets...
                    </div>
                  </td>
                </tr>
              ) : buckets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No storage buckets found. Create one to get started.
                  </td>
                </tr>
              ) : (
                buckets.map((bucket) => (
                  <tr key={bucket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {bucket.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bucket.created}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bucket.files}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        bucket.status === 'private' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {bucket.status === 'private' ? '🔒 Private' : '🌐 Public'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setMessage(`📂 Opening bucket: ${bucket.name}`)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={loadingBuckets}
                      >
                        📂 Browse
                      </button>
                      <button
                        onClick={() => deleteBucket(bucket.name)}
                        className="text-red-600 hover:text-red-900"
                        disabled={loadingBuckets}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Bucket Modal */}
      {showCreateBucket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Create New Bucket</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bucket Name
                </label>
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="my-new-bucket"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateBucket(false);
                  setNewBucketName('');
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createBucket}
                disabled={loadingBuckets}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingBuckets ? '⏳ Creating...' : '➕ Create Bucket'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add API Key Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Add New API Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service
                </label>
                <select
                  value={newKey.service}
                  onChange={(e) => setNewKey(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a service...</option>
                  {predefinedServices.map(service => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKey.key_name}
                  onChange={(e) => setNewKey(prev => ({ ...prev, key_name: e.target.value }))}
                  placeholder="e.g., Main OpenAI Key, Production Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key / Value
                </label>
                <input
                  type="password"
                  value={newKey.key_value}
                  onChange={(e) => setNewKey(prev => ({ ...prev, key_value: e.target.value }))}
                  placeholder="Enter your API key or value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKey({ service: '', key_name: '', key_value: '' });
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addApiKey}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '⏳ Adding...' : '➕ Add Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeySettings;