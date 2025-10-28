import React, { useState } from 'react';

interface DocumentSettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

const DocumentSettings: React.FC<DocumentSettingsProps> = ({ user, setMessage }) => {
  const [uploadedDocs, setUploadedDocs] = useState([
    {
      id: '1',
      name: 'Company_Overview.pdf',
      type: 'PDF',
      size: '2.3 MB',
      uploadDate: '2024-10-27',
      status: 'processed'
    },
    {
      id: '2',
      name: 'Product_Features.docx',
      type: 'Word',
      size: '1.8 MB',
      uploadDate: '2024-10-26',
      status: 'processing'
    }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setMessage(`📄 Uploading ${files.length} file(s)...`);
      // Handle file upload logic here
    }
  };

  const deleteDocument = (id: string) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== id));
    setMessage('✅ Document deleted successfully');
  };

  return (
    <div className="space-y-6">
      {/* Document Upload */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">📄 Business Context Documents</h4>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">Upload Business Documents</p>
          <p className="text-gray-500 mb-4">
            PDF, Word, Text, Markdown, CSV, PowerPoint files up to 25MB
          </p>
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button 
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Choose Files
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Supported formats:</strong> PDF, Word (.doc, .docx), Text (.txt), Markdown (.md), CSV, PowerPoint (.ppt, .pptx)</p>
          <p><strong>Purpose:</strong> These documents provide business context to AI for more relevant and informed responses.</p>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h4 className="text-lg font-semibold">📚 Uploaded Documents</h4>
        </div>
        
        <div className="divide-y">
          {uploadedDocs.map((doc) => (
            <div key={doc.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {doc.type === 'PDF' && <span className="text-red-500">📄</span>}
                  {doc.type === 'Word' && <span className="text-blue-500">📝</span>}
                  {doc.type === 'Text' && <span className="text-gray-500">📃</span>}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.type} • {doc.size} • Uploaded {doc.uploadDate}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  doc.status === 'processed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {doc.status === 'processed' ? '✅ Processed' : '🔄 Processing'}
                </span>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {uploadedDocs.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No documents uploaded yet. Upload business documents to improve AI responses.
          </div>
        )}
      </div>

      {/* Document Processing Settings */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">⚙️ Processing Settings</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context Relevance Threshold
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              defaultValue="0.7"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Less Relevant</span>
              <span>More Relevant</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Context Length
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="1000">1,000 characters</option>
              <option value="2000" selected>2,000 characters</option>
              <option value="3000">3,000 characters</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input type="checkbox" id="auto-extract" className="mr-2" defaultChecked />
            <label htmlFor="auto-extract" className="text-sm text-gray-700">
              Auto-extract text from documents
            </label>
          </div>
          
          <div className="flex items-center">
            <input type="checkbox" id="smart-chunking" className="mr-2" defaultChecked />
            <label htmlFor="smart-chunking" className="text-sm text-gray-700">
              Smart content chunking for better context
            </label>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">💡 Usage Guidelines:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload company overviews, product descriptions, and brand guidelines</li>
          <li>• Include FAQs, support documentation, and knowledge base articles</li>
          <li>• Add competitive analysis and market research documents</li>
          <li>• Documents are processed to extract relevant context for AI responses</li>
          <li>• All uploaded content is encrypted and stored securely</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentSettings;