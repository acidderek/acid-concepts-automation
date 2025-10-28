import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CampaignIntelligence {
  id: string;
  campaign_id: string;
  user_id: string;
  company_name?: string;
  company_description?: string;
  target_audience?: string;
  key_messaging?: string;
  brand_voice?: string;
  competitive_advantages?: string;
  products_services?: string;
  document_count: number;
  last_document_upload?: string;
  created_at: string;
  updated_at: string;
}

interface CampaignDocument {
  id: string;
  campaign_id: string;
  intelligence_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  status: string;
  processed_content?: string;
  summary?: string;
  key_points?: string[];
  created_at: string;
  updated_at: string;
}

interface AIResponseLog {
  id: string;
  campaign_id: string;
  intelligence_id: string;
  user_id: string;
  reddit_post_id?: string;
  reddit_comment_id?: string;
  parent_comment_id?: string;
  subreddit: string;
  response_type: string;
  ai_response_content: string;
  context_used?: string;
  business_context?: string;
  reddit_score: number;
  reddit_replies: number;
  engagement_updated_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CampaignIntelligenceProps {
  campaignId: string;
  user: any;
  setMessage: (message: string) => void;
}

export const CampaignIntelligence: React.FC<CampaignIntelligenceProps> = ({ 
  campaignId, 
  user, 
  setMessage 
}) => {
  const [activeTab, setActiveTab] = useState<'business' | 'documents' | 'ai_log'>('business');
  const [intelligence, setIntelligence] = useState<CampaignIntelligence | null>(null);
  const [documents, setDocuments] = useState<CampaignDocument[]>([]);
  const [aiResponses, setAiResponses] = useState<AIResponseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadStatus, setUploadStatus] = useState<{[key: string]: string}>({});
  const [bucketSettings, setBucketSettings] = useState({
    bucketName: '',
    endpoint: '',
    region: ''
  });
  const [wasabiKeys, setWasabiKeys] = useState({
    accessKey: '',
    secretKey: ''
  });

  // Business Intelligence Form State
  const [businessForm, setBusinessForm] = useState({
    company_name: '',
    company_description: '',
    target_audience: '',
    key_messaging: '',
    brand_voice: '',
    competitive_advantages: '',
    products_services: ''
  });

  useEffect(() => {
    loadCampaignIntelligence();
    loadDocuments();
    loadAIResponses();
    loadBucketSettings();
  }, [campaignId]);

  const loadBucketSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .in('service', ['wasabi_bucket', 'wasabi_endpoint', 'wasabi_region', 'wasabi_access', 'wasabi_secret']);

      if (error) {
        console.error('Error loading bucket settings:', error);
        return;
      }

      const settings = { bucketName: '', endpoint: '', region: '' };
      const keys = { accessKey: '', secretKey: '' };
      
      data?.forEach(item => {
        if (item.service === 'wasabi_bucket') settings.bucketName = item.key_value;
        if (item.service === 'wasabi_endpoint') settings.endpoint = item.key_value;
        if (item.service === 'wasabi_region') settings.region = item.key_value;
        if (item.service === 'wasabi_access') keys.accessKey = item.key_value;
        if (item.service === 'wasabi_secret') keys.secretKey = item.key_value;
      });

      setBucketSettings(settings);
      setWasabiKeys(keys);
      console.log('Loaded Wasabi settings:', { settings, hasKeys: !!keys.accessKey && !!keys.secretKey });
    } catch (error) {
      console.error('Exception loading bucket settings:', error);
    }
  };

  const loadCampaignIntelligence = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaign_intelligence_2025_10_27_20_00')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading intelligence:', error);
        return;
      }

      if (data) {
        setIntelligence(data);
        setBusinessForm({
          company_name: data.company_name || '',
          company_description: data.company_description || '',
          target_audience: data.target_audience || '',
          key_messaging: data.key_messaging || '',
          brand_voice: data.brand_voice || '',
          competitive_advantages: data.competitive_advantages || '',
          products_services: data.products_services || ''
        });
      }
    } catch (error) {
      console.error('Exception loading intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_documents_2025_10_27_20_00')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Exception loading documents:', error);
    }
  };

  const loadAIResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_response_log_2025_10_27_20_00')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading AI responses:', error);
        return;
      }

      setAiResponses(data || []);
    } catch (error) {
      console.error('Exception loading AI responses:', error);
    }
  };

  const saveBusiness = async () => {
    try {
      setLoading(true);
      
      if (intelligence) {
        // Update existing
        const { error } = await supabase
          .from('campaign_intelligence_2025_10_27_20_00')
          .update({
            ...businessForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', intelligence.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('campaign_intelligence_2025_10_27_20_00')
          .insert({
            campaign_id: campaignId,
            user_id: user.id,
            ...businessForm
          })
          .select()
          .single();

        if (error) throw error;
        setIntelligence(data);
      }

      setMessage('✅ Business intelligence saved successfully');
      loadCampaignIntelligence();
    } catch (error) {
      console.error('Error saving business intelligence:', error);
      setMessage('❌ Error saving business intelligence');
    } finally {
      setLoading(false);
    }
  };

  const uploadToWasabi = async (file: File, filePath: string): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      const fileId = `${file.name}-${Date.now()}`;
      
      try {
        // Initialize progress
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        setUploadStatus(prev => ({ ...prev, [fileId]: 'Preparing upload...' }));

        // Get presigned upload URL from Edge Function
        const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
          'wasabi_upload_handler_2025_10_27_21_40',
          {
            body: {
              filePath,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size
            }
          }
        );

        if (uploadError || !uploadData.success) {
          throw new Error(uploadData?.error || 'Failed to prepare upload');
        }

        setUploadStatus(prev => ({ ...prev, [fileId]: 'Starting upload...' }));

        // Create form data with presigned fields
        const formData = new FormData();
        Object.entries(uploadData.formData).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        formData.append('file', file); // File must be last

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [fileId]: percentComplete }));
            setUploadStatus(prev => ({ 
              ...prev, 
              [fileId]: `Uploading... ${percentComplete}% (${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB)`
            }));
          }
        });

        // Success handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const completedTime = new Date().toLocaleString();
            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
            setUploadStatus(prev => ({ 
              ...prev, 
              [fileId]: `✅ Upload completed at ${completedTime}`
            }));
            resolve(true);
          } else {
            console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
            setUploadStatus(prev => ({ 
              ...prev, 
              [fileId]: `❌ Upload failed: ${xhr.status} ${xhr.statusText}`
            }));
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        // Error handler
        xhr.addEventListener('error', () => {
          setUploadStatus(prev => ({ 
            ...prev, 
            [fileId]: `❌ Upload error: Network error`
          }));
          reject(new Error('Network error during upload'));
        });

        console.log('Uploading to:', uploadData.uploadUrl);
        console.log('Form data keys:', Object.keys(uploadData.formData));

        // Send POST request with form data
        xhr.open('POST', uploadData.uploadUrl);
        xhr.send(formData);

      } catch (error) {
        console.error('Upload preparation error:', error);
        setUploadStatus(prev => ({ 
          ...prev, 
          [fileId]: `❌ Upload failed: ${error.message}`
        }));
        reject(error);
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!intelligence) {
      setMessage('❌ Please save business information first');
      return;
    }

    if (!bucketSettings.bucketName || !wasabiKeys.accessKey || !wasabiKeys.secretKey) {
      setMessage('❌ Please configure your Wasabi credentials in Settings → API Keys');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({});
      setUploadStatus({});
      
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          // Use the correct path structure: campaign documents/campaign_ID/Document.extension
          const filePath = `campaign documents/${campaignId}/${file.name}`;
          
          console.log('Uploading to Wasabi bucket:', bucketSettings.bucketName);
          console.log('File path:', filePath);
          console.log('Using access key:', wasabiKeys.accessKey.substring(0, 8) + '...');
          
          // Upload to Wasabi using direct API
          const success = await uploadToWasabi(file, filePath);
          
          if (success) {
            // Save document record in database
            const { error: docError } = await supabase
              .from('campaign_documents_2025_10_27_20_00')
              .insert({
                campaign_id: campaignId,
                intelligence_id: intelligence.id,
                user_id: user.id,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                file_type: file.name.split('.').pop() || 'unknown',
                mime_type: file.type
              });

            if (docError) {
              console.error('Document record error:', docError);
            }
          }
          
          return success;
        } catch (error) {
          console.error('File upload error:', error);
          return false;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount === files.length) {
        setMessage(`✅ All ${successCount} files uploaded successfully to Wasabi bucket: ${bucketSettings.bucketName}`);
      } else {
        setMessage(`⚠️ ${successCount}/${files.length} files uploaded successfully`);
      }
      
      loadDocuments();
      loadCampaignIntelligence();
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage('❌ Error uploading files to Wasabi');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (doc: CampaignDocument) => {
    try {
      // Delete from the user's configured Wasabi bucket
      if (bucketSettings.bucketName) {
        const { error: storageError } = await supabase.storage
          .from(bucketSettings.bucketName)
          .remove([doc.file_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete record
      const { error: dbError } = await supabase
        .from('campaign_documents_2025_10_27_20_00')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setMessage('✅ Document deleted successfully');
      loadDocuments();
      loadCampaignIntelligence();
    } catch (error) {
      console.error('Error deleting document:', error);
      setMessage('❌ Error deleting document');
    }
  };

  const renderBusinessTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Business Intelligence</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={businessForm.company_name}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <input
              type="text"
              value={businessForm.target_audience}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, target_audience: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Who are your customers?"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
            <textarea
              value={businessForm.company_description}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, company_description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What does your company do?"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Messaging</label>
            <textarea
              value={businessForm.key_messaging}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, key_messaging: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What are your main messages and value propositions?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand Voice</label>
            <textarea
              value={businessForm.brand_voice}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, brand_voice: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="How should AI communicate? (Professional, casual, technical, etc.)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Competitive Advantages</label>
            <textarea
              value={businessForm.competitive_advantages}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, competitive_advantages: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What makes you different from competitors?"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Products & Services</label>
            <textarea
              value={businessForm.products_services}
              onChange={(e) => setBusinessForm(prev => ({ ...prev, products_services: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List your main products and services"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={saveBusiness}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Business Intelligence'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Document Library</h3>
        
        {/* Storage Configuration Display */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-900 mb-2">🪣 Storage Configuration</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Bucket:</strong> {bucketSettings.bucketName || 'Not configured'}</p>
            <p><strong>Path:</strong> campaign documents/{campaignId}/[filename]</p>
            {!bucketSettings.bucketName && (
              <p className="text-red-600 mt-2">
                ⚠️ Please configure your Wasabi bucket in Settings → API Keys → Storage Bucket Settings
              </p>
            )}
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileUpload}
            disabled={uploading || !intelligence}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Supported: PDF, Word, Excel, Text, CSV files (max 50MB each)
          </p>
          {!intelligence && (
            <p className="text-sm text-red-500 mt-1">
              Please save business information first before uploading documents.
            </p>
          )}
          {(!bucketSettings.bucketName || !wasabiKeys.accessKey) && (
            <p className="text-sm text-red-500 mt-1">
              Please configure Wasabi credentials in Settings → API Keys first.
            </p>
          )}
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-6 space-y-3">
            <h4 className="font-medium text-gray-900">📊 Upload Progress</h4>
            {Object.entries(uploadProgress).map(([fileId, progress]) => {
              const fileName = fileId.split('-')[0];
              const status = uploadStatus[fileId] || 'Preparing...';
              const isComplete = progress === 100;
              
              return (
                <div key={fileId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{fileName}</span>
                    <div className="flex items-center space-x-2">
                      {isComplete && <span className="text-green-600">✅</span>}
                      <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Status */}
                  <div className="text-xs text-gray-600">{status}</div>
                  
                  {/* Verification Checkbox */}
                  {isComplete && (
                    <div className="mt-2 flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`verify-${fileId}`}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        defaultChecked
                        disabled
                      />
                      <label htmlFor={`verify-${fileId}`} className="text-xs text-green-600">
                        Upload verified and completed
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {documents.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Uploaded Documents ({documents.length})</h4>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{doc.file_name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.file_type.toUpperCase()} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB • 
                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Status: <span className={`font-medium ${
                      doc.status === 'processed' ? 'text-green-600' :
                      doc.status === 'processing' ? 'text-yellow-600' :
                      doc.status === 'error' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {doc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc)}
                  className="text-red-600 hover:text-red-800 ml-4"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <p>No documents uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAILogTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Response Log</h3>
        
        {aiResponses.length > 0 ? (
          <div className="space-y-4">
            {aiResponses.map((response) => (
              <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      response.response_type === 'new_post' ? 'bg-blue-100 text-blue-800' :
                      response.response_type === 'comment_reply' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {response.response_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">r/{response.subreddit}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(response.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>⭐ {response.reddit_score}</span>
                    <span>💬 {response.reddit_replies}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      response.status === 'posted' ? 'bg-green-100 text-green-800' :
                      response.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      response.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {response.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <h5 className="font-medium text-gray-900 mb-2">AI Response:</h5>
                  <div className="text-gray-800 whitespace-pre-wrap text-sm">
                    {response.ai_response_content}
                  </div>
                </div>
                
                {response.context_used && (
                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <h5 className="font-medium text-blue-900 mb-2">Context Used:</h5>
                    <div className="text-blue-800 text-sm">
                      {response.context_used.substring(0, 200)}...
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {response.reddit_post_id && (
                    <span>Post ID: {response.reddit_post_id}</span>
                  )}
                  {response.reddit_comment_id && (
                    <span>Comment ID: {response.reddit_comment_id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>No AI responses logged yet</p>
            <p className="text-sm mt-1">AI responses will appear here when the system starts posting</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('business')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'business'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏢 Business Intelligence
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📄 Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('ai_log')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ai_log'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🤖 AI Response Log ({aiResponses.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'business' && renderBusinessTab()}
      {activeTab === 'documents' && renderDocumentsTab()}
      {activeTab === 'ai_log' && renderAILogTab()}
    </div>
  );
};

export default CampaignIntelligence;