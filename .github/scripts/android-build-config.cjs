// All branches use the same hosted API; only the update publisher varies.
module.exports = function configure({ branch, env }) {
  const value = (name) => (env[name] || '').trim();
  const rawUrl = value('ANDROID_API_URL') || 'https://kkfc-demo-api.onrender.com/api';
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.search || url.hash || url.pathname.replace(/\/$/, '') !== '/api') {
    throw new Error('Android API URL must be HTTPS, end in /api, and contain no credentials, query, or fragment.');
  }
  return {
    apiUrl: url.toString().replace(/\/$/, ''),
    updatesEnabled: branch === (value('ANDROID_UPDATE_BRANCH') || 'staging'),
  };
};
