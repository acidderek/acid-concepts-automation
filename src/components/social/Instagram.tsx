import React from 'react';

interface InstagramProps {
  user: any;
  setMessage: (message: string) => void;
}

const Instagram: React.FC<InstagramProps> = ({ user, setMessage }) => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📷 Instagram Tools</h2>
        <p className="text-gray-600">Manage Instagram posts, stories, and engagement</p>
      </div>

      <div className="bg-pink-50 p-6 rounded-lg border border-pink-200">
        <div className="text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-semibold text-pink-800 mb-2">Coming Soon</h3>
          <p className="text-pink-700 mb-4">
            Instagram automation tools are currently in development.
          </p>
          <div className="text-sm text-pink-600">
            <p><strong>Planned Features:</strong></p>
            <ul className="mt-2 space-y-1">
              <li>• Automated post scheduling</li>
              <li>• Story management</li>
              <li>• Comment monitoring and replies</li>
              <li>• Hashtag optimization</li>
              <li>• Engagement analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instagram;