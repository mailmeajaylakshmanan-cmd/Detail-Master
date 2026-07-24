import React, { useState } from 'react';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function UpdateCredentials() {
  const [currentEmail, setCurrentEmail] = useState(localStorage.getItem('userEmail') || '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/update', {
        currentEmail,
        newEmail: newEmail || currentEmail,
        newPassword
      });
      toast.success('Credentials updated successfully!');
      
      // If email was changed, update local storage
      if (newEmail && newEmail !== currentEmail) {
        localStorage.setItem('userEmail', newEmail);
      }
      
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '20px', color: '#1F1F1F', fontFamily: 'Playfair Display' }}>Update Credentials</h2>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
        This is a temporary screen to change your admin username/email or password.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>Current Username</label>
          <input 
            type="text" 
            value={currentEmail} 
            onChange={e => setCurrentEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>New Username</label>
          <input 
            type="text" 
            value={newEmail} 
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Leave blank to keep current username"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>New Password</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)}
            required
            placeholder="Enter new password"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: '#C5A859', color: '#fff', padding: '10px', 
            border: 'none', borderRadius: '4px', fontWeight: 'bold', 
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'Updating...' : 'Update Credentials'}
        </button>
      </form>
    </div>
  );
}
