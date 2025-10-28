import React from 'react';

interface CompanyManagerProps {
  user: any;
  setMessage: (message: string) => void;
}

const CompanyManager: React.FC<CompanyManagerProps> = ({ user, setMessage }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🏢 Company Management</h2>
        <p className="text-gray-600 mb-6">
          Manage company profiles, business intelligence, and campaign contexts.
        </p>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Coming Soon</h3>
            <p className="text-gray-700 mb-4">
              Company management features are currently in development.
            </p>
            <div className="text-sm text-gray-600">
              <p><strong>Planned Features:</strong></p>
              <ul className="mt-2 space-y-1">
                <li>• Company profile management</li>
                <li>• Business intelligence documents</li>
                <li>• Brand guidelines and messaging</li>
                <li>• Campaign context and goals</li>
                <li>• Competitive analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyManager;