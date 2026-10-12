import { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

export default function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState('');
  if (!credentials) return null;
  const loginUrl = `${window.location.origin}${credentials.loginUrl}`;
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); } catch (e) { /* clipboard blocked */ }
  };
  const row = (key, label, value) => (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className="input font-mono" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-outline" onClick={() => copy(key, value)} aria-label={`Copy ${label}`}>{copied === key ? <Check size={16} /> : <Copy size={16} />}</button>
      </div>
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Seller credentials" closeOnBackdrop={false} footer={<button className="btn-primary" onClick={onClose}>I have saved the credentials</button>}>
      <div className="mb-4 flex gap-2 rounded-lg bg-sun-100 p-3 text-sm text-yellow-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>This password is shown only once and is stored hashed. Share it with the seller through a secure channel. They will be asked to change it after signing in.</p>
      </div>
      <div className="space-y-3">
        {row('url', 'Seller sign-in page', loginUrl)}
        {row('email', 'Login email', credentials.email)}
        {row('pwd', 'Temporary password', credentials.password)}
      </div>
    </Modal>
  );
}
