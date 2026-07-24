import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios.js';
import toast from 'react-hot-toast';
import OfferForm from '../components/OfferForm.jsx';
import { Gift } from 'lucide-react';

export default function AssignOffer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get('phone');
    if (phone) {
      api.get('/customers').then(res => {
        const c = res.data.find(c => c.phone === phone);
        if (c) {
          setInitialData({ customer: c });
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [location.search]);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      const res = await api.post('/offers', data);
      toast.success('Offer Package generated!');
      navigate('/offers/' + res.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating offer');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8 ml-2">
        <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white/60 flex items-center justify-center">
          <Gift className="text-amber-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Assign Offer Package</h1>
          <p className="text-[13px] font-medium text-gray-600 mt-0.5">Select a template and assign it to a customer.</p>
        </div>
      </div>

      <OfferForm initial={initialData} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
