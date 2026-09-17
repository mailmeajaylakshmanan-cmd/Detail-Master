import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Trash2, Printer, MessageCircle, Download,
  CheckCircle2, AlertCircle, Calendar, IndianRupee, Car, User, Phone,
  MapPin, Shield, Sparkles, Wrench, Droplets, CircleDashed, ChevronDown,
  RefreshCw, Check, ArrowRight, X, Clock, ExternalLink, Copy, Tag, Percent,
  Building2, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useClients, useOrganizations, useServices, useVehicleTypes, useThirdPartyServices } from '../hooks/useQueries.js';
import StandardDocumentLayout from '../components/StandardDocumentLayout.jsx';
import { downloadElementPDF, generatePDFBlob } from '../utils/pdfGenerator.js';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ICONS = [Car, Shield, CircleDashed, Sparkles, Droplets, Wrench];

export default function QuotationPage() {
  const navigate = useNavigate();

  // Mode: 'builder' or 'history'
  const [activeTab, setActiveTab] = useState('builder');

  // Master Data Queries
  const { data: clientsData, refetch: refetchClients } = useClients();
  const { data: organizations = [], refetch: refetchOrganizations } = useOrganizations();
  const { data: servicesData = [] } = useServices();
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const { data: thirdPartyServicesData = [] } = useThirdPartyServices();

  const allClients = clientsData?.clients || [];

  // Quotation History State
  const [quotationsList, setQuotationsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Customer Type: 'individual' | 'organization'
  const [customerType, setCustomerType] = useState('individual');

  // Individual Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Organization Customer State
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState(null);

  // Selected Vehicle (shared)
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Manual / Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_make: '',
    vehicle_model: '',
    license_plate: '',
    vehicle_type_id: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Manual / Quick Add Organization Modal
  const [showAddOrganizationModal, setShowAddOrganizationModal] = useState(false);
  const [newOrganizationForm, setNewOrganizationForm] = useState({
    org_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    vehicle_make: '',
    vehicle_model: '',
    license_plate: '',
    vehicle_type_id: '',
  });
  const [savingOrganization, setSavingOrganization] = useState(false);

  // Manual / Quick Add Vehicle Modal
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    make: '',
    model: '',
    license_plate: '',
    vehicle_type_id: '',
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Services State
  const [serviceSourceTab, setServiceSourceTab] = useState('all'); // 'all', 'in_house', 'third_party'
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedServices, setSelectedServices] = useState([]);

  // Financial State
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' (₹) or 'percent' (%)
  const [discountValue, setDiscountValue] = useState('');
  const [notes, setNotes] = useState('Quotation valid for 15 days from issuance. Actual paint correction / preparation charges subject to visual inspection on arrival.');
  const [validDays, setValidDays] = useState(15);

  // Quotation Metadata
  const [quotationNumber, setQuotationNumber] = useState(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `QT-${ym}-${rand}`;
  });
  const [quotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [savedQuotationId, setSavedQuotationId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', description: '', price: '', quantity: 1 });

  // Filtered Clients for dropdown search
  const filteredClients = useMemo(() => {
    if (!customerSearch.trim()) return allClients.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return allClients.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.vehicles && c.vehicles.some(v => v.plate?.toLowerCase().includes(q) || `${v.make} ${v.model}`.toLowerCase().includes(q)))
    ).slice(0, 10);
  }, [allClients, customerSearch]);

  // Filtered Organizations for dropdown search
  const filteredOrganizations = useMemo(() => {
    if (!organizationSearch.trim()) return organizations.slice(0, 8);
    const q = organizationSearch.toLowerCase();
    return organizations.filter(o => 
      ((o.org_name || o.name) && (o.org_name || o.name).toLowerCase().includes(q)) ||
      (o.contact_person && o.contact_person.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.vehicles && o.vehicles.some(v => v.plate?.toLowerCase().includes(q) || `${v.make} ${v.model}`.toLowerCase().includes(q)))
    ).slice(0, 10);
  }, [organizations, organizationSearch]);

  // Available Categories
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    servicesData.forEach(s => {
      if (s.description) cats.add(s.description);
    });
    return Array.from(cats);
  }, [servicesData]);

  // Helper to resolve price based on selected vehicle type for in-house services
  const resolvePrice = (service, vehicleTypeId) => {
    if (!service) return 0;
    if (vehicleTypeId && service.vehiclePricesMap && service.vehiclePricesMap[vehicleTypeId] !== undefined) {
      return Number(service.vehiclePricesMap[vehicleTypeId]);
    }
    return Number(service.price || 0);
  };

  // Helper to resolve price for third-party services (selling price + labour charge)
  const resolveThirdPartyPrice = (tp, vehicleTypeId) => {
    if (!tp) return 0;
    const selling = (vehicleTypeId && tp.vehiclePricesMap && tp.vehiclePricesMap[vehicleTypeId] !== undefined)
      ? Number(tp.vehiclePricesMap[vehicleTypeId])
      : Number(tp.sellingPrice || 0);
    const labour = (Number(tp.labourCount) || 1) * (Number(tp.labourCharge) || 0);
    return selling + labour;
  };

  // Filtered In-House Services List
  const filteredServices = useMemo(() => {
    return servicesData.filter(s => {
      const matchCat = selectedCategory === 'All' || s.description === selectedCategory;
      const matchQuery = !serviceSearch.trim() || 
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
        (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()));
      return matchCat && matchQuery && s.isActive;
    });
  }, [servicesData, selectedCategory, serviceSearch]);

  // Filtered Third-Party Services List
  const filteredThirdPartyServices = useMemo(() => {
    return thirdPartyServicesData.filter(t => {
      const matchQuery = !serviceSearch.trim() ||
        t.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (t.vendorName && t.vendorName.toLowerCase().includes(serviceSearch.toLowerCase()));
      return matchQuery && t.isActive;
    });
  }, [thirdPartyServicesData, serviceSearch]);

  // Calculations
  const subTotal = useMemo(() => {
    return selectedServices.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  }, [selectedServices]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return Math.min(subTotal, (subTotal * val) / 100);
    }
    return Math.min(subTotal, val);
  }, [subTotal, discountValue, discountType]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount);
  }, [subTotal, discountAmount]);

  const validUntilDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(validDays || 15));
    return d.toISOString().slice(0, 10);
  }, [validDays]);

  // Toggle In-House Service
  const toggleService = (service) => {
    const existsIndex = selectedServices.findIndex(s => s.id === service.id && !s.isCustom && !s.isThirdParty);
    if (existsIndex >= 0) {
      setSelectedServices(prev => prev.filter((_, i) => i !== existsIndex));
    } else {
      const price = resolvePrice(service, selectedVehicle?.vehicle_type_id);
      setSelectedServices(prev => [
        ...prev,
        {
          id: service.id,
          name: service.name,
          description: service.description || '',
          price: price,
          quantity: 1,
          isCustom: false,
          isThirdParty: false,
          originalService: service,
        }
      ]);
    }
  };

  // Toggle Third-Party Service
  const toggleThirdPartyService = (tp) => {
    const tpKey = `tp-${tp.id}`;
    const existsIndex = selectedServices.findIndex(s => s.id === tpKey);
    if (existsIndex >= 0) {
      setSelectedServices(prev => prev.filter((_, i) => i !== existsIndex));
    } else {
      const fullPrice = resolveThirdPartyPrice(tp, selectedVehicle?.vehicle_type_id);
      const selling = (selectedVehicle?.vehicle_type_id && tp.vehiclePricesMap && tp.vehiclePricesMap[selectedVehicle.vehicle_type_id] !== undefined)
        ? Number(tp.vehiclePricesMap[selectedVehicle.vehicle_type_id])
        : Number(tp.sellingPrice || 0);
      const labour = (Number(tp.labourCount) || 1) * (Number(tp.labourCharge) || 0);

      setSelectedServices(prev => [
        ...prev,
        {
          id: tpKey,
          tpOriginalId: tp.id,
          name: tp.name,
          description: `Third-Party (${tp.vendorName || 'Outsourced'})`,
          price: fullPrice,
          sellingPrice: selling,
          labourCharge: labour,
          quantity: 1,
          isCustom: false,
          isThirdParty: true,
          vendorName: tp.vendorName || '',
          originalThirdParty: tp,
        }
      ]);
    }
  };

  const updateServiceQuantity = (index, delta) => {
    setSelectedServices(prev => {
      const updated = [...prev];
      const newQty = Math.max(1, (updated[index].quantity || 1) + delta);
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const updateServicePrice = (index, newPrice) => {
    setSelectedServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], price: Number(newPrice) || 0 };
      return updated;
    });
  };

  const removeSelectedService = (index) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomItem = (e) => {
    e.preventDefault();
    if (!customItemForm.name.trim()) {
      toast.error('Please provide a service or item name');
      return;
    }
    setSelectedServices(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customItemForm.name.trim(),
        description: customItemForm.description.trim(),
        price: Number(customItemForm.price) || 0,
        quantity: Number(customItemForm.quantity) || 1,
        isCustom: true,
      }
    ]);
    setCustomItemForm({ name: '', description: '', price: '', quantity: 1 });
    setShowCustomItemModal(false);
    toast.success('Custom item added');
  };

  // Re-resolve service prices when vehicle selection changes
  const handleSelectVehicle = (veh) => {
    setSelectedVehicle(veh);
    if (veh?.vehicle_type_id) {
      setSelectedServices(prev => prev.map(s => {
        if (s.isCustom) return s;
        if (s.isThirdParty && s.originalThirdParty) {
          const newPrice = resolveThirdPartyPrice(s.originalThirdParty, veh.vehicle_type_id);
          const selling = (s.originalThirdParty.vehiclePricesMap && s.originalThirdParty.vehiclePricesMap[veh.vehicle_type_id] !== undefined)
            ? Number(s.originalThirdParty.vehiclePricesMap[veh.vehicle_type_id])
            : Number(s.originalThirdParty.sellingPrice || 0);
          return { ...s, price: newPrice, sellingPrice: selling };
        }
        if (s.originalService) {
          const newPrice = resolvePrice(s.originalService, veh.vehicle_type_id);
          return { ...s, price: newPrice };
        }
        return s;
      }));
    }
  };

  // Quick Add Customer Handler
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }

    setSavingCustomer(true);
    try {
      const vt = vehicleTypes.find(t => String(t.id) === String(newCustomerForm.vehicle_type_id));
      const payload = {
        full_name: newCustomerForm.name.trim(),
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
      };

      if (newCustomerForm.license_plate.trim() || newCustomerForm.vehicle_make.trim()) {
        payload.vehicles = [{
          make: newCustomerForm.vehicle_make.trim(),
          model: newCustomerForm.vehicle_model.trim(),
          plate: newCustomerForm.license_plate.trim().toUpperCase(),
          type: vt?.name || 'Sedan',
          vehicle_type_id: newCustomerForm.vehicle_type_id ? Number(newCustomerForm.vehicle_type_id) : null,
        }];
      }

      const res = await api.post('/clients', payload);
      await refetchClients();

      const created = res.data;
      setSelectedClient({
        id: created.id,
        name: created.full_name || created.name || payload.name,
        phone: created.phone || payload.phone,
        address: created.address || payload.address,
        vehicles: created.vehicles || payload.vehicles || [],
      });

      if (created.vehicles && created.vehicles.length > 0) {
        handleSelectVehicle(created.vehicles[0]);
      }

      toast.success('Customer registered successfully');
      setShowAddCustomerModal(false);
      setNewCustomerForm({
        name: '', phone: '', email: '', address: '',
        vehicle_make: '', vehicle_model: '', license_plate: '', vehicle_type_id: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Quick Add Organization Handler
  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrganizationForm.org_name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setSavingOrganization(true);
    try {
      const vt = vehicleTypes.find(t => String(t.id) === String(newOrganizationForm.vehicle_type_id));
      const payload = {
        org_name: newOrganizationForm.org_name.trim(),
        contact_person: newOrganizationForm.contact_person.trim(),
        phone: newOrganizationForm.phone.trim(),
        email: newOrganizationForm.email.trim(),
        address: newOrganizationForm.address.trim(),
      };

      const res = await api.post('/organizations', payload);
      const createdOrg = res.data;
      let orgVehicles = [];

      if (newOrganizationForm.license_plate.trim() || newOrganizationForm.vehicle_make.trim()) {
        const vehPayload = {
          organization_id: createdOrg.id,
          make_model: `${newOrganizationForm.vehicle_make.trim()} ${newOrganizationForm.vehicle_model.trim()}`.trim() || 'Vehicle',
          license_vin: newOrganizationForm.license_plate.trim().toUpperCase(),
          vehicle_type: vt?.name || 'Sedan',
          vehicle_type_id: newOrganizationForm.vehicle_type_id ? Number(newOrganizationForm.vehicle_type_id) : null,
        };
        const vehRes = await api.post('/vehicles', vehPayload);
        const newVeh = {
          id: vehRes.data.id,
          make: newOrganizationForm.vehicle_make.trim(),
          model: newOrganizationForm.vehicle_model.trim(),
          plate: newOrganizationForm.license_plate.trim().toUpperCase(),
          type: vt?.name || 'Sedan',
          vehicle_type_id: vehPayload.vehicle_type_id,
        };
        orgVehicles.push(newVeh);
        handleSelectVehicle(newVeh);
      }

      await refetchOrganizations();

      setSelectedOrganization({
        id: createdOrg.id,
        org_name: createdOrg.org_name || payload.org_name,
        name: createdOrg.org_name || payload.org_name,
        contact_person: createdOrg.contact_person || payload.contact_person,
        phone: createdOrg.phone || payload.phone,
        address: createdOrg.address || payload.address,
        vehicles: orgVehicles,
      });

      toast.success('Organization registered successfully');
      setShowAddOrganizationModal(false);
      setNewOrganizationForm({
        org_name: '', contact_person: '', phone: '', email: '', address: '',
        vehicle_make: '', vehicle_model: '', license_plate: '', vehicle_type_id: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating organization');
    } finally {
      setSavingOrganization(false);
    }
  };

  // Quick Add Vehicle to selected customer / organization
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const isOrg = customerType === 'organization';
    const targetEntityId = isOrg ? selectedOrganization?.id : selectedClient?.id;
    if (!targetEntityId) {
      toast.error(isOrg ? 'Please select or create an organization first' : 'Please select or create a customer first');
      return;
    }
    if (!newVehicleForm.license_plate.trim() && !newVehicleForm.make.trim()) {
      toast.error('Please enter vehicle details');
      return;
    }

    setSavingVehicle(true);
    try {
      const vt = vehicleTypes.find(t => String(t.id) === String(newVehicleForm.vehicle_type_id));
      const payload = {
        client_id: isOrg ? null : selectedClient.id,
        organization_id: isOrg ? selectedOrganization.id : null,
        make_model: `${newVehicleForm.make.trim()} ${newVehicleForm.model.trim()}`.trim() || 'Vehicle',
        license_vin: newVehicleForm.license_plate.trim().toUpperCase(),
        vehicle_type: vt?.name || 'Sedan',
        vehicle_type_id: newVehicleForm.vehicle_type_id ? Number(newVehicleForm.vehicle_type_id) : null,
      };

      const res = await api.post('/vehicles', payload);
      const newVeh = {
        id: res.data.id,
        make: newVehicleForm.make.trim(),
        model: newVehicleForm.model.trim(),
        plate: newVehicleForm.license_plate.trim().toUpperCase(),
        type: vt?.name || 'Sedan',
        vehicle_type_id: payload.vehicle_type_id,
      };

      if (isOrg) {
        setSelectedOrganization(prev => ({
          ...prev,
          vehicles: [...(prev?.vehicles || []), newVeh]
        }));
        await refetchOrganizations();
      } else {
        setSelectedClient(prev => ({
          ...prev,
          vehicles: [...(prev?.vehicles || []), newVeh]
        }));
        await refetchClients();
      }
      handleSelectVehicle(newVeh);

      toast.success('Vehicle added successfully');
      setShowAddVehicleModal(false);
      setNewVehicleForm({ make: '', model: '', license_plate: '', vehicle_type_id: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding vehicle');
    } finally {
      setSavingVehicle(false);
    }
  };

  // Save Quotation to DB
  const handleSaveQuotation = async (silent = false) => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return null;
    }

    setIsSaving(true);
    try {
      const isOrg = customerType === 'organization';
      const clientName = isOrg
        ? (selectedOrganization ? (selectedOrganization.org_name || selectedOrganization.name) : 'Walk-in Organization')
        : (selectedClient?.name || 'Walk-in Customer');
      const clientPhone = isOrg
        ? (selectedOrganization?.phone || '')
        : (selectedClient?.phone || '');
      const clientAddress = isOrg
        ? (selectedOrganization?.address || '')
        : (selectedClient?.address || '');

      const payload = {
        client_id: isOrg ? null : (selectedClient?.id || null),
        organization_id: isOrg ? (selectedOrganization?.id || null) : null,
        client_name: clientName,
        client_phone: clientPhone,
        client_address: clientAddress,
        vehicle_id: selectedVehicle?.id || null,
        vehicle_name: selectedVehicle ? `${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim() : '',
        license_plate: selectedVehicle?.plate || '',
        vehicle_type: selectedVehicle?.type || (vehicleTypes.find(t => t.id === selectedVehicle?.vehicle_type_id)?.name) || '',
        sub_total: subTotal,
        discount: discountAmount,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        grand_total: grandTotal,
        notes: notes,
        valid_until: validUntilDate,
        status: 'draft',
        services: selectedServices.map(s => ({
          service: s.name,
          description: s.description || '',
          price: Number(s.price) || 0,
          quantity: Number(s.quantity) || 1,
          total: (Number(s.price) || 0) * (Number(s.quantity) || 1),
          isCustom: !!s.isCustom,
          isThirdParty: !!s.isThirdParty,
          vendorName: s.vendorName || '',
        })),
      };

      let res;
      if (savedQuotationId) {
        res = await api.put(`/quotations/${savedQuotationId}`, payload);
        if (!silent) toast.success(`Quotation ${res.data.quotation_number} updated`);
      } else {
        res = await api.post('/quotations', payload);
        setSavedQuotationId(res.data.id);
        setQuotationNumber(res.data.quotation_number);
        if (!silent) toast.success(`Quotation ${res.data.quotation_number} saved`);
      }
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quotation');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Print Quotation
  const handlePrint = () => {
    if (selectedServices.length === 0) {
      toast.error('Add services before printing');
      return;
    }
    window.print();
  };

  // Helper to fetch server-generated PDF blob or fallback to client-side
  const fetchQuotationPDFBlob = async (qId) => {
    if (qId) {
      try {
        const response = await api.get(`/quotations/${qId}/pdf`);
        const base64 = response.data.base64;
        if (base64) {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
        }
      } catch (err) {
        console.warn('Server PDF generation fallback to client-side:', err?.message);
      }
    }
    return await generatePDFBlob('quotation-print', `DetailingMasters-Quotation-${quotationNumber}.pdf`);
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (selectedServices.length === 0) {
      toast.error('Add services before downloading PDF');
      return;
    }

    setIsDownloading(true);
    try {
      const saved = await handleSaveQuotation(true);
      const targetId = saved?.id || savedQuotationId;
      const blob = await fetchQuotationPDFBlob(targetId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DetailingMasters-Quotation-${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success('Quotation PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Error downloading PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // WhatsApp Share - Opens Share Document modal
  const handleWhatsAppShare = async () => {
    if (selectedServices.length === 0) {
      toast.error('Add services to share quotation');
      return;
    }

    setShareModalOpen(true);
    setSharing(true);
    setShareFile(null);

    try {
      const saved = await handleSaveQuotation(true);
      const targetId = saved?.id || savedQuotationId;
      const blob = await fetchQuotationPDFBlob(targetId);
      const file = new File([blob], `DetailingMasters-Quotation-${quotationNumber}.pdf`, { type: 'application/pdf' });
      setShareFile(file);
    } catch (err) {
      console.error('Error generating PDF for sharing:', err);
      toast.error('Could not generate PDF for sharing');
      setShareModalOpen(false);
    } finally {
      setSharing(false);
    }
  };

  // Handle direct share via Web Share API or download + WhatsApp open
  const handleDirectShare = () => {
    if (!shareFile) return;

    if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      navigator.share({
        title: `Quotation ${quotationNumber} — DETAILING MASTERS`,
        files: [shareFile],
      }).catch(e => {
        if (e.name !== 'AbortError') console.error(e);
      });
    } else {
      const url = URL.createObjectURL(shareFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      const isOrg = customerType === 'organization';
      const clientName = isOrg
        ? (selectedOrganization ? `${selectedOrganization.org_name || selectedOrganization.name}${selectedOrganization.contact_person ? ` (${selectedOrganization.contact_person})` : ''}` : 'Organization')
        : (selectedClient?.name || 'Customer');
      const vehicleInfo = selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.plate || 'No Plate'})` : 'Vehicle';

      let msg = `*DETAILING MASTERS — ESTIMATE / QUOTATION*\n`;
      msg += `------------------------------------\n`;
      msg += `📄 *Quotation No:* ${quotationNumber}\n`;
      msg += `📅 *Date:* ${fmtDate(quotationDate)}\n`;
      msg += `🏢 *Client:* ${clientName}\n`;
      msg += `🚗 *Vehicle:* ${vehicleInfo}\n`;
      msg += `------------------------------------\n`;
      msg += `*SERVICES INCLUDED:*\n`;
      selectedServices.forEach((s, idx) => {
        msg += `${idx + 1}. ${s.name} (x${s.quantity}) — ₹${fmt(s.price * s.quantity)}\n`;
      });
      msg += `------------------------------------\n`;
      msg += `💰 *Subtotal:* ₹${fmt(subTotal)}\n`;
      if (discountAmount > 0) {
        msg += `🏷️ *Discount:* -₹${fmt(discountAmount)}\n`;
      }
      msg += `✨ *NO TAX APPLIED (Net Cost)*\n`;
      msg += `⭐ *GRAND TOTAL: ₹${fmt(grandTotal)}*\n`;
      msg += `------------------------------------\n`;
      msg += `📍 *Detailing Masters*, Opposite KTM Bike Showroom, Chankai, Marthandam.\n`;
      msg += `📞 Contact: +91 9994122652\n`;
      msg += `*Valid for 15 Days*`;

      const encoded = encodeURIComponent(msg);
      const phoneToUse = isOrg ? (selectedOrganization?.phone || '') : (selectedClient?.phone || '');
      const rawPhone = phoneToUse.replace(/\D/g, '');
      const fullPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

      const waUrl = fullPhone ? `https://wa.me/${fullPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
      window.open(waUrl, '_blank');
      toast.success('PDF downloaded. Attach it in WhatsApp!');
    }
    setShareModalOpen(false);
  };

  // Convert Quotation into a New Invoice
  const handleConvertToInvoice = () => {
    if (selectedServices.length === 0) {
      toast.error('Add services before converting');
      return;
    }

    const inHouse = selectedServices.filter(s => !s.isThirdParty);
    const thirdParty = selectedServices.filter(s => s.isThirdParty);
    const isOrg = customerType === 'organization';

    navigate('/invoices/new', {
      state: {
        fromQuotation: {
          clientType: customerType,
          organizationId: isOrg ? selectedOrganization?.id : null,
          organization: isOrg ? selectedOrganization : null,
          client: isOrg
            ? { ...selectedOrganization, isOrganization: true, clientType: 'organization' }
            : selectedClient,
          vehicle: selectedVehicle,
          services: inHouse.map(s => ({
            serviceId: s.id,
            serviceName: s.name,
            price: s.price,
            quantity: s.quantity,
          })),
          thirdPartyServices: thirdParty.map(t => ({
            serviceId: t.tpOriginalId,
            serviceName: t.name,
            vendorName: t.vendorName,
            sellingPrice: t.sellingPrice,
            labourCharge: t.labourCharge,
            price: t.price,
            quantity: t.quantity,
          })),
          discount: discountAmount,
          notes: notes,
        }
      }
    });
  };

  // Fetch Quotation History
  const loadQuotationsHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/quotations', {
        params: {
          q: historySearch || undefined,
          status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined,
        }
      });
      setQuotationsList(res.data?.quotations || []);
    } catch (err) {
      toast.error('Error fetching quotation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load selected quotation from history back into the builder
  const loadQuotationToBuilder = (q) => {
    setSavedQuotationId(q.id);
    setQuotationNumber(q.quotation_number);

    if (q.organization_id) {
      setCustomerType('organization');
      const foundOrg = organizations.find(o => String(o.id) === String(q.organization_id));
      const vehList = q.vehicle_name ? [{
        id: q.vehicle_id,
        make: (q.vehicle_name || '').split(' ')[0] || '',
        model: (q.vehicle_name || '').split(' ').slice(1).join(' ') || '',
        plate: q.license_plate,
        type: q.vehicle_type,
      }] : [];

      setSelectedOrganization(foundOrg ? {
        ...foundOrg,
        vehicles: foundOrg.vehicles?.length ? foundOrg.vehicles : vehList
      } : {
        id: q.organization_id,
        org_name: q.organization_name || q.client_name,
        name: q.organization_name || q.client_name,
        phone: q.organization_phone || q.client_phone,
        contact_person: q.organization_contact_person || '',
        address: q.client_address || '',
        vehicles: vehList,
      });
      setSelectedClient(null);
    } else {
      setCustomerType('individual');
      setSelectedOrganization(null);
      setSelectedClient({
        id: q.client_id,
        name: q.client_name,
        phone: q.client_phone,
        address: q.client_address,
        vehicles: q.vehicle_name ? [{
          id: q.vehicle_id,
          make: (q.vehicle_name || '').split(' ')[0] || '',
          model: (q.vehicle_name || '').split(' ').slice(1).join(' ') || '',
          plate: q.license_plate,
          type: q.vehicle_type,
        }] : []
      });
    }

    if (q.vehicle_name || q.license_plate) {
      setSelectedVehicle({
        id: q.vehicle_id,
        make: (q.vehicle_name || '').split(' ')[0] || '',
        model: (q.vehicle_name || '').split(' ').slice(1).join(' ') || '',
        plate: q.license_plate || '',
        type: q.vehicle_type || '',
      });
    } else {
      setSelectedVehicle(null);
    }

    const services = Array.isArray(q.services) ? q.services : [];
    setSelectedServices(services.map((s, idx) => ({
      id: s.id || `history-${idx}`,
      name: s.service || s.name,
      description: s.description || '',
      price: Number(s.price ?? s.unit_price ?? 0),
      quantity: Number(s.quantity || 1),
      isThirdParty: !!s.isThirdParty,
      vendorName: s.vendorName || '',
    })));

    setDiscountType(q.discount_type || 'fixed');
    setDiscountValue(q.discount_value || q.discount || '');
    setNotes(q.notes || '');
    setActiveTab('builder');
    toast.success(`Loaded Quotation ${q.quotation_number}`);
  };

  // Delete Quotation
  const handleDeleteQuotation = async (id, qNum) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${qNum}?`)) return;
    try {
      await api.delete(`/quotations/${id}`);
      toast.success('Quotation deleted');
      setQuotationsList(prev => prev.filter(item => item.id !== id));
      if (savedQuotationId === id) {
        setSavedQuotationId(null);
      }
    } catch (err) {
      toast.error('Failed to delete quotation');
    }
  };

  // Reset / Clear Builder
  const handleNewQuotation = () => {
    setSavedQuotationId(null);
    setCustomerType('individual');
    setSelectedClient(null);
    setSelectedOrganization(null);
    setSelectedVehicle(null);
    setSelectedServices([]);
    setDiscountValue('');
    setCustomerSearch('');
    setOrganizationSearch('');
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    setQuotationNumber(`QT-${ym}-${rand}`);
    toast.success('Started new quotation');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F6CB59] to-[#E5B537] flex items-center justify-center text-black shadow-sm font-bold">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Quotation & Cost Estimate
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Create customer cost estimates with dynamic vehicle pricing, custom discounts, and zero tax.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle & Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200/80 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'builder'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Quotation Builder
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadQuotationsHistory();
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Quotation History
            </button>
          </div>

          {activeTab === 'builder' && (
            <button
              onClick={handleNewQuotation}
              className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              title="Start New Quotation"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: QUOTATION BUILDER
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Controls, Customer, Vehicle, Services, Discounts (7 Cols) */}
          <div className="xl:col-span-6 space-y-6 print:hidden">

            {/* 1. Customer & Vehicle Selection Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                  {customerType === 'organization' ? (
                    <Building2 size={18} className="text-[#E5B537]" />
                  ) : (
                    <User size={18} className="text-[#E5B537]" />
                  )}
                  <span>1. {customerType === 'organization' ? 'Organization & Fleet Details' : 'Customer & Vehicle Details'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Customer Type Segmented Switch */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/70">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerType('individual');
                        setSelectedVehicle(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        customerType === 'individual'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <User size={12} /> Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerType('organization');
                        setSelectedVehicle(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        customerType === 'organization'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Building2 size={12} /> Organization
                    </button>
                  </div>

                  {customerType === 'individual' ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Plus size={13} /> Add Customer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddOrganizationModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Plus size={13} /> Add Organization
                    </button>
                  )}
                </div>
              </div>

              {/* Individual Mode Search */}
              {customerType === 'individual' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Select Existing Customer
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by customer name, phone number, or car number..."
                      className="w-full pl-9 pr-8 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/50 focus:bg-white transition-all"
                    />
                    {customerSearch && (
                      <button
                        onClick={() => setCustomerSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {customerSearch && (
                    <div className="max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 text-xs">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client);
                            setCustomerSearch('');
                            if (client.vehicles && client.vehicles.length > 0) {
                              handleSelectVehicle(client.vehicles[0]);
                            } else {
                              setSelectedVehicle(null);
                            }
                          }}
                          className="p-2.5 hover:bg-amber-50/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{client.name}</p>
                            <p className="text-[11px] text-gray-500">{client.phone} {client.address ? `• ${client.address}` : ''}</p>
                          </div>
                          {client.vehicles?.length > 0 && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                              {client.vehicles.length} {client.vehicles.length === 1 ? 'car' : 'cars'}
                            </span>
                          )}
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="p-3 text-center text-gray-500">
                          No customer found. <button onClick={() => { setShowAddCustomerModal(true); setNewCustomerForm(prev => ({ ...prev, name: customerSearch })); }} className="text-blue-600 font-bold underline ml-1">Create "{customerSearch}"?</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Organization Mode Search */}
              {customerType === 'organization' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Select Existing Organization
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={organizationSearch}
                      onChange={(e) => setOrganizationSearch(e.target.value)}
                      placeholder="Search by organization name, contact person, phone, or car..."
                      className="w-full pl-9 pr-8 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/50 focus:bg-white transition-all"
                    />
                    {organizationSearch && (
                      <button
                        onClick={() => setOrganizationSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {organizationSearch && (
                    <div className="max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 text-xs">
                      {filteredOrganizations.map((org) => (
                        <div
                          key={org.id}
                          onClick={() => {
                            setSelectedOrganization(org);
                            setOrganizationSearch('');
                            if (org.vehicles && org.vehicles.length > 0) {
                              handleSelectVehicle(org.vehicles[0]);
                            } else {
                              setSelectedVehicle(null);
                            }
                          }}
                          className="p-2.5 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">{org.org_name || org.name}</p>
                              {org.contact_person && (
                                <span className="text-[10px] text-gray-500 font-medium">({org.contact_person})</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">{org.phone || 'No phone'} {org.address ? `• ${org.address}` : ''}</p>
                          </div>
                          {org.vehicles?.length > 0 && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                              {org.vehicles.length} {org.vehicles.length === 1 ? 'vehicle' : 'fleet vehicles'}
                            </span>
                          )}
                        </div>
                      ))}
                      {filteredOrganizations.length === 0 && (
                        <div className="p-3 text-center text-gray-500">
                          No organization found. <button onClick={() => { setShowAddOrganizationModal(true); setNewOrganizationForm(prev => ({ ...prev, org_name: organizationSearch })); }} className="text-blue-600 font-bold underline ml-1">Create "{organizationSearch}"?</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Entity Preview Card */}
              {customerType === 'individual' ? (
                selectedClient ? (
                  <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3 flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">{selectedClient.name}</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded">Individual Customer</span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium flex items-center gap-1.5">
                        <Phone size={11} className="text-gray-400" /> {selectedClient.phone || 'No phone'}
                        {selectedClient.address && (
                          <>
                            <span>•</span>
                            <MapPin size={11} className="text-gray-400" /> {selectedClient.address}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedClient(null); setSelectedVehicle(null); }}
                      className="text-gray-400 hover:text-rose-600 p-1"
                      title="Change customer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 font-medium">No customer selected (Will show as Walk-in Customer on Quotation)</p>
                  </div>
                )
              ) : (
                selectedOrganization ? (
                  <div className="bg-blue-50/40 border border-blue-200/70 rounded-xl p-3 flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">{selectedOrganization.org_name || selectedOrganization.name}</span>
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-200/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Building2 size={10} /> Organization Client
                        </span>
                      </div>
                      {selectedOrganization.contact_person && (
                        <p className="text-[11px] text-blue-900 font-semibold">Contact: {selectedOrganization.contact_person}</p>
                      )}
                      <p className="text-[11px] text-gray-600 font-medium flex items-center gap-1.5">
                        <Phone size={11} className="text-gray-400" /> {selectedOrganization.phone || 'No phone'}
                        {selectedOrganization.address && (
                          <>
                            <span>•</span>
                            <MapPin size={11} className="text-gray-400" /> {selectedOrganization.address}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedOrganization(null); setSelectedVehicle(null); }}
                      className="text-gray-400 hover:text-rose-600 p-1"
                      title="Change organization"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 font-medium">No organization selected (Will show as Walk-in Organization on Quotation)</p>
                  </div>
                )
              )}

              {/* Vehicle Selection for Selected Customer / Organization */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Car size={13} className="text-gray-400" />
                    {customerType === 'organization' ? "Select Fleet Vehicle" : "Select Customer's Vehicle"}
                  </label>
                  {(customerType === 'organization' ? selectedOrganization : selectedClient) && (
                    <button
                      type="button"
                      onClick={() => setShowAddVehicleModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <Plus size={11} /> {customerType === 'organization' ? 'Add Fleet Car' : 'Add Another Car'}
                    </button>
                  )}
                </div>

                {((customerType === 'organization' ? selectedOrganization?.vehicles : selectedClient?.vehicles) || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {((customerType === 'organization' ? selectedOrganization.vehicles : selectedClient.vehicles) || []).map((v) => {
                      const isSelected = selectedVehicle?.id === v.id || (v.plate && selectedVehicle?.plate === v.plate);
                      const vtName = v.type || vehicleTypes.find(t => t.id === v.vehicle_type_id)?.name || 'Vehicle';
                      return (
                        <div
                          key={v.id || v.plate || `${v.make}-${v.model}`}
                          onClick={() => handleSelectVehicle(v)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50 border-[#F6CB59] shadow-xs'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-extrabold text-xs text-gray-900">
                                {v.make} {v.model}
                              </p>
                              <p className="text-[11px] font-mono text-gray-600 font-bold uppercase">
                                {v.plate || 'No Reg No'}
                              </p>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black text-[#F6CB59] uppercase">
                              {vtName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">No registered vehicles found.</span>
                    <button
                      onClick={() => setShowAddVehicleModal(true)}
                      className="text-xs font-bold text-gray-900 bg-white border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 shadow-2xs"
                    >
                      + Add Car Details
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Services Selection Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                  <Sparkles size={18} className="text-[#E5B537]" />
                  <span>2. Select Services (No Tax Applied)</span>
                </div>
                <button
                  onClick={() => setShowCustomItemModal(true)}
                  className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Custom Service
                </button>
              </div>

              {/* Source Tabs: All vs In-House vs Third-Party */}
              <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setServiceSourceTab('all')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    serviceSourceTab === 'all'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All Services ({filteredServices.length + filteredThirdPartyServices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceSourceTab('in_house')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    serviceSourceTab === 'in_house'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Detailing Services ({filteredServices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceSourceTab('third_party')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    serviceSourceTab === 'third_party'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Third-Party ({filteredThirdPartyServices.length})
                </button>
              </div>

              {/* Service Filter & Search */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services or vendor..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/50"
                  />
                </div>
                {serviceSourceTab !== 'third_party' && (
                  <div className="flex gap-1 overflow-x-auto pb-1 max-w-full hide-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? 'bg-black text-[#F6CB59] shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Services List / Chip Grid */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
                {/* 1. In-House Services */}
                {(serviceSourceTab === 'all' || serviceSourceTab === 'in_house') && (
                  filteredServices.map((service) => {
                    const isSelected = selectedServices.some(s => s.id === service.id && !s.isCustom && !s.isThirdParty);
                    const price = resolvePrice(service, selectedVehicle?.vehicle_type_id);
                    const hasCustomTypePrice = selectedVehicle?.vehicle_type_id && service.vehiclePricesMap?.[selectedVehicle.vehicle_type_id] !== undefined;

                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-black text-[#F6CB59] border-black'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{service.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              {service.description || 'Master Service'}
                              {hasCustomTypePrice && (
                                <span className="ml-1.5 text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-1 py-0.2 rounded">
                                  {selectedVehicle?.type} rate
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                          ₹{fmt(price)}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* 2. Third-Party Services */}
                {(serviceSourceTab === 'all' || serviceSourceTab === 'third_party') && (
                  filteredThirdPartyServices.map((tp) => {
                    const tpKey = `tp-${tp.id}`;
                    const isSelected = selectedServices.some(s => s.id === tpKey);
                    const price = resolveThirdPartyPrice(tp, selectedVehicle?.vehicle_type_id);
                    const selling = (selectedVehicle?.vehicle_type_id && tp.vehiclePricesMap && tp.vehiclePricesMap[selectedVehicle.vehicle_type_id] !== undefined)
                      ? Number(tp.vehiclePricesMap[selectedVehicle.vehicle_type_id])
                      : Number(tp.sellingPrice || 0);
                    const labour = (Number(tp.labourCount) || 1) * (Number(tp.labourCharge) || 0);

                    return (
                      <div
                        key={tpKey}
                        onClick={() => toggleThirdPartyService(tp)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-900">{tp.name}</p>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                Third-Party
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium">
                              Vendor: <span className="font-semibold text-gray-700">{tp.vendorName || 'Outsourced'}</span>
                              {labour > 0 && <span className="ml-1 text-gray-400">({`Part: ₹${fmt(selling)} + Labour: ₹${fmt(labour)}`})</span>}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                          ₹{fmt(price)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Services Basket / Summary List */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Selected Services ({selectedServices.length})
                  </span>
                  {selectedServices.length > 0 && (
                    <button
                      onClick={() => setSelectedServices([])}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedServices.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">Click any service above to add it to the quotation.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedServices.map((s, idx) => (
                      <div key={`${s.id}-${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-gray-900 truncate">{s.name}</p>
                            {s.isThirdParty && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                Third-Party
                              </span>
                            )}
                          </div>
                          {s.description && <p className="text-[10px] text-gray-500 truncate">{s.description}</p>}
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 mr-3">
                          <button
                            onClick={() => updateServiceQuantity(idx, -1)}
                            className="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{s.quantity}</span>
                          <button
                            onClick={() => updateServiceQuantity(idx, 1)}
                            className="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Input & Total */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-20">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                            <input
                              type="number"
                              value={s.price}
                              onChange={(e) => updateServicePrice(idx, e.target.value)}
                              className="w-full pl-4 pr-1 py-1 text-right font-mono font-bold text-xs bg-white border border-gray-200 rounded focus:outline-none"
                            />
                          </div>
                          <span className="font-mono font-bold text-xs text-gray-900 w-16 text-right">
                            ₹{fmt(s.price * s.quantity)}
                          </span>
                          <button
                            onClick={() => removeSelectedService(idx)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Discount Box & Financial Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                  <Tag size={18} className="text-[#E5B537]" />
                  <span>3. Pricing & Discount Box</span>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Zero Tax (No GST)
                </span>
              </div>

              {/* Discount Box Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                    Discount Type
                  </label>
                  <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        discountType === 'fixed'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Flat Amount (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        discountType === 'percent'
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Percentage (%)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                    Discount Value {discountType === 'fixed' ? '(₹)' : '(%)'}
                  </label>
                  <div className="relative">
                    {discountType === 'fixed' ? (
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    ) : (
                      <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    )}
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'fixed' ? 'e.g. 500' : 'e.g. 10'}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F6CB59]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Quotation Validity & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Validity (Days)
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  >
                    <option value={7}>7 Days</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Quotation Terms / Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900"
                    placeholder="e.g. Valid for 15 days..."
                  />
                </div>
              </div>

              {/* Live Financial Breakdown Bar */}
              <div className="p-4 rounded-xl bg-gray-900 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Subtotal</span>
                    <span className="font-mono text-base font-bold">₹{fmt(subTotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Discount</span>
                      <span className="font-mono text-base font-bold text-rose-400">-₹{fmt(discountAmount)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Tax</span>
                    <span className="font-mono text-xs font-bold text-emerald-300">₹0.00 (Exempt)</span>
                  </div>
                </div>

                <div className="text-right border-t sm:border-t-0 sm:border-l border-gray-800 pt-2 sm:pt-0 sm:pl-6">
                  <span className="text-[10px] font-black text-[#F6CB59] uppercase tracking-wider block">Grand Total</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-[#F6CB59]">
                    ₹{fmt(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-2.5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={14} />
                  <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={sharing}
                  className="px-2.5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <MessageCircle size={14} />
                  <span>{sharing ? 'Generating...' : 'WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-2.5 bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation()}
                  disabled={isSaving}
                  className="px-2.5 py-2.5 bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvertToInvoice}
                  className="px-2.5 py-2.5 bg-gradient-to-r from-[#F6CB59] to-[#E5B537] text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 transition-all col-span-2 sm:col-span-1"
                >
                  <span>To Invoice</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Live Invoice-Style PDF Document (5 Cols) */}
          <div className="xl:col-span-6 sticky top-6 space-y-3 print:col-span-12 print:w-full print:static print:p-0 print:m-0">
            <div className="flex items-center justify-between px-2 print:hidden">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Printer size={14} /> Live Invoice-Style PDF Preview
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                  title="Print Quotation"
                >
                  <Printer size={12} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="px-2 py-1 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                  title="Download PDF"
                >
                  <Download size={12} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={sharing}
                  className="px-2 py-1 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
                  title="WhatsApp Share"
                >
                  <MessageCircle size={12} />
                  <span>WhatsApp</span>
                </button>
                <span className="text-[11px] font-mono text-gray-500 font-bold ml-1">
                  {quotationNumber}
                </span>
              </div>
            </div>

            {/* StandardDocumentLayout Document Container */}
            <div className="bg-white rounded-2xl border border-gray-300/80 shadow-lg p-2 overflow-hidden print:border-none print:shadow-none print:p-0 print:overflow-visible">
              <StandardDocumentLayout
                documentId="quotation-print"
                documentTitle="QUOTATION"
                titleFontSize={34}
                customFooter={
                  <div style={{ position: 'relative', width: '100%', marginTop: 'auto', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* QUOTATION NOTES & TERMS */}
                    <div style={{ padding: '5px 40px', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px 0', color: '#111', textTransform: 'uppercase' }}>ESTIMATE TERMS & CONDITIONS</h3>
                      <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                        <div>• {notes || 'Valid for 15 days from issuance date.'}</div>
                        <div>• All prices quoted are net amounts (zero tax applicable).</div>
                        <div>• Detailing Masters Marthandam | Ph: +91 9994122652 | Email: detailingmasters2024@gmail.com</div>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div style={{ margin: '0 40px', borderTop: '1.5px solid #111', paddingTop: '12px', paddingBottom: '25px', textAlign: 'center', fontSize: 11, color: '#111', zIndex: 10, position: 'relative' }}>
                      <strong>Detailing Masters</strong>, Opposite KTM Bike Showroom, Chankai, Marthandam, Tamil Nadu 629155.<br/>
                      Ph: +91 9994122652 | E-mail: detailingmasters2024@gmail.com
                    </div>
                  </div>
                }
              >
                {/* INFO SECTIONS */}
                <div style={{ padding: '16px 40px', backgroundColor: 'transparent', position: 'relative', zIndex: 1, fontFamily: "'Inter', sans-serif", display: 'flex', gap: '30px' }}>
                  
                  {/* Detailing Masters Info */}
                  <div style={{ flex: '1 1 50%' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px 0', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ESTIMATE ISSUED BY
                    </h3>
                    <div style={{ fontSize: 13, color: '#111827', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ width: 75, color: '#6B7280', fontSize: 12 }}>Address:</span>
                        <span style={{ flex: 1, fontWeight: 500, lineHeight: 1.4 }}>Opposite KTM Bike Showroom, Chankai, Marthandam</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 75, color: '#6B7280', fontSize: 12 }}>Phone:</span>
                        <span style={{ fontWeight: 500 }}>+91 9994122652</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 75, color: '#6B7280', fontSize: 12 }}>Email:</span>
                        <span style={{ fontWeight: 500 }}>detailingmasters2024@gmail.com</span>
                      </div>
                    </div>
                  </div>

                  {/* Client & Car Info */}
                  <div style={{ flex: '1 1 50%' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px 0', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {customerType === 'organization' ? 'ORGANIZATION & VEHICLE INFO' : 'CLIENT & VEHICLE INFO'}
                    </h3>
                    <div style={{ fontSize: 13, color: '#111827', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Quote No:</span>
                        <span style={{ fontWeight: 700, color: '#000' }}>{quotationNumber}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>
                          {customerType === 'organization' ? 'Organization:' : 'Customer:'}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {customerType === 'organization'
                            ? (selectedOrganization?.org_name || selectedOrganization?.name || 'Walk-in Organization')
                            : (selectedClient?.name || 'Walk-in Customer')}
                        </span>
                      </div>
                      {customerType === 'organization' && selectedOrganization?.contact_person && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Contact:</span>
                          <span style={{ fontWeight: 500 }}>{selectedOrganization.contact_person}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Phone:</span>
                        <span style={{ fontWeight: 500 }}>
                          {(customerType === 'organization' ? selectedOrganization?.phone : selectedClient?.phone) || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Car Model:</span>
                        <span style={{ fontWeight: 600 }}>
                          {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : '—'}
                          {selectedVehicle?.type ? ` (${selectedVehicle.type})` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Vehicle No:</span>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedVehicle?.plate || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 95, color: '#6B7280', fontSize: 12 }}>Date:</span>
                        <span style={{ fontWeight: 500 }}>{fmtDate(quotationDate)} (Valid: {fmtDate(validUntilDate)})</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* SERVICES TABLE */}
                <div style={{ padding: '10px 40px 0 40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0A0A0A', textTransform: 'uppercase' }}>
                      ESTIMATED SERVICES
                    </h3>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                      TAX RATE: 0% (NO TAX)
                    </span>
                  </div>
                  <div style={{ height: 2, backgroundColor: '#0A0A0A', marginBottom: 12 }}></div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0A0A0A', color: '#fff' }}>
                        <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #000', width: '45%' }}>Service</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '15%' }}>Qty</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '20%' }}>Unit Rate (₹)</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, border: '1px solid #000', width: '20%' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedServices.length > 0 ? (
                        selectedServices.map((s, idx) => {
                          const IconComp = ICONS[idx % ICONS.length];
                          return (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#f8fafc' }}>
                              <td style={{ padding: '6px 10px', border: '1px solid #000' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ backgroundColor: '#F6CB59', borderRadius: 3, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <IconComp size={10} color="#000" />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#000' }}>{s.name}</div>
                                    {s.isThirdParty ? (
                                      <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                                        [Third-Party Service • Vendor: {s.vendorName || 'Outsourced'}]
                                      </div>
                                    ) : (
                                      s.description && <div style={{ fontSize: 10, color: '#666' }}>{s.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #000', color: '#333' }}>
                                {s.quantity}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #000', color: '#333', fontVariantNumeric: 'tabular-nums' }}>
                                ₹{fmt(s.price)}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #000', color: '#000', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                ₹{fmt(s.price * s.quantity)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px 10px', textAlign: 'center', border: '1px solid #000', color: '#64748b' }}>
                            Select services from the left panel to populate the quotation.
                          </td>
                        </tr>
                      )}

                      {/* Subtotal Row */}
                      {selectedServices.length > 0 && (
                        <tr>
                          <td colSpan="2" style={{ border: 'none', backgroundColor: 'transparent' }}></td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, border: '1px solid #000' }}>Sub Total</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>₹{fmt(subTotal)}</td>
                        </tr>
                      )}

                      {/* Discount Row */}
                      {discountAmount > 0 && (
                        <tr>
                          <td colSpan="2" style={{ border: 'none', backgroundColor: 'transparent' }}></td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, border: '1px solid #000', color: '#dc2626' }}>
                            Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, border: '1px solid #000', color: '#dc2626' }}>
                            -₹{fmt(discountAmount)}
                          </td>
                        </tr>
                      )}

                      {/* Grand Total Banner */}
                      <tr>
                        <td colSpan="2" style={{ border: 'none', backgroundColor: 'transparent' }}></td>
                        <td colSpan="2" style={{ border: 'none', padding: 0, backgroundColor: 'transparent' }}>
                          <div style={{
                            backgroundColor: '#F6CB59',
                            color: '#000',
                            padding: '8px 12px',
                            fontWeight: 800,
                            fontSize: 14,
                            textAlign: 'center',
                            width: '100%',
                            border: '1px solid #000',
                            borderTop: 'none',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box'
                          }}>
                            GRAND TOTAL: ₹{fmt(grandTotal)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </StandardDocumentLayout>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: QUOTATION HISTORY
      ────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black text-gray-900">Saved Quotations Log</h2>
              <p className="text-xs text-gray-500">Search and re-open, print, or convert previous estimates into invoices.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadQuotationsHistory()}
                  placeholder="Search quote no, client, plate..."
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value);
                  setTimeout(loadQuotationsHistory, 50);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="converted">Converted</option>
              </select>

              <button
                onClick={loadQuotationsHistory}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
                title="Refresh"
              >
                <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-y border-gray-100">
                <tr>
                  <th className="py-3 px-4">Quote No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotationsList.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-gray-900">
                      {q.quotation_number}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-medium">
                      {fmtDate(q.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-gray-900">{q.client_name}</p>
                        {q.organization_id && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                            <Building2 size={9} /> Org
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">{q.client_phone || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-800">{q.vehicle_name || '—'}</p>
                      <p className="text-[10px] font-mono text-gray-500">{q.license_plate || '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600">
                      ₹{fmt(q.sub_total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                      {q.discount > 0 ? `-₹${fmt(q.discount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                      ₹{fmt(q.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {q.status || 'draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => loadQuotationToBuilder(q)}
                        className="px-2.5 py-1 bg-black text-[#F6CB59] rounded-lg font-bold text-[11px] hover:brightness-110"
                        title="Open in Builder"
                      >
                        Open
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await fetchQuotationPDFBlob(q.id);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `DetailingMasters-Quotation-${q.quotation_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(url), 2000);
                            toast.success('Quotation PDF downloaded');
                          } catch (err) {
                            toast.error('Could not download PDF');
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg inline-flex items-center"
                        title="Download PDF"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => {
                          loadQuotationToBuilder(q);
                          setTimeout(() => window.print(), 350);
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg inline-flex items-center"
                        title="Print Quotation"
                      >
                        <Printer size={13} />
                      </button>
                      <button
                        onClick={() => {
                          loadQuotationToBuilder(q);
                          setTimeout(() => handleWhatsAppShare(), 350);
                        }}
                        className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg inline-flex items-center"
                        title="Share via WhatsApp"
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteQuotation(q.id, q.quotation_number)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded inline-flex items-center"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {quotationsList.length === 0 && !loadingHistory && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No quotations found in history. Click "Quotation Builder" to create your first estimate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS: QUICK ADD CUSTOMER
      ────────────────────────────────────────────────────────────── */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <User size={16} className="text-[#E5B537]" /> Add New Customer
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={e => setNewCustomerForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newCustomerForm.phone}
                    onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Address / Location</label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={e => setNewCustomerForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  placeholder="Marthandam / Nagercoil"
                />
              </div>

              {/* Vehicle section inside customer modal */}
              <div className="border-t border-gray-100 pt-2.5 space-y-2">
                <span className="text-[11px] font-bold text-gray-800 block">Car Information (Optional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Make (e.g. Hyundai)"
                    value={newCustomerForm.vehicle_make}
                    onChange={e => setNewCustomerForm(f => ({ ...f, vehicle_make: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. Creta)"
                    value={newCustomerForm.vehicle_model}
                    onChange={e => setNewCustomerForm(f => ({ ...f, vehicle_model: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Number Plate (TN 75 AA 1234)"
                    value={newCustomerForm.license_plate}
                    onChange={e => setNewCustomerForm(f => ({ ...f, license_plate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                  />
                  <select
                    value={newCustomerForm.vehicle_type_id}
                    onChange={e => setNewCustomerForm(f => ({ ...f, vehicle_type_id: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
                  >
                    <option value="">Select Type</option>
                    {vehicleTypes.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-gray-900 rounded-xl shadow-xs"
                >
                  {savingCustomer ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS: QUICK ADD ORGANIZATION
      ────────────────────────────────────────────────────────────── */}
      {showAddOrganizationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Building2 size={16} className="text-[#E5B537]" /> Add New Organization
              </h3>
              <button onClick={() => setShowAddOrganizationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrganization} className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={newOrganizationForm.org_name}
                  onChange={e => setNewOrganizationForm(f => ({ ...f, org_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  placeholder="e.g. ABC Logistics / Star Tours"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newOrganizationForm.contact_person}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, contact_person: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. Mr. Ramesh"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newOrganizationForm.phone}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Email</label>
                  <input
                    type="email"
                    value={newOrganizationForm.email}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="fleet@company.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Address / City</label>
                  <input
                    type="text"
                    value={newOrganizationForm.address}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="Marthandam"
                  />
                </div>
              </div>

              {/* Fleet Vehicle section inside organization modal */}
              <div className="border-t border-gray-100 pt-2.5 space-y-2">
                <span className="text-[11px] font-bold text-gray-800 block">Initial Fleet Car (Optional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Make (e.g. Toyota)"
                    value={newOrganizationForm.vehicle_make}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, vehicle_make: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. Innova)"
                    value={newOrganizationForm.vehicle_model}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, vehicle_model: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Number Plate (TN 75 AA 1234)"
                    value={newOrganizationForm.license_plate}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, license_plate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                  />
                  <select
                    value={newOrganizationForm.vehicle_type_id}
                    onChange={e => setNewOrganizationForm(f => ({ ...f, vehicle_type_id: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
                  >
                    <option value="">Select Type</option>
                    {vehicleTypes.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrganizationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOrganization}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-gray-900 rounded-xl shadow-xs"
                >
                  {savingOrganization ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS: QUICK ADD VEHICLE
      ────────────────────────────────────────────────────────────── */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Car size={16} className="text-[#E5B537]" /> Add Car to {customerType === 'organization' ? 'Organization Fleet' : 'Customer'}
              </h3>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddVehicle} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Make</label>
                  <input
                    type="text"
                    value={newVehicleForm.make}
                    onChange={e => setNewVehicleForm(f => ({ ...f, make: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. BMW"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Model</label>
                  <input
                    type="text"
                    value={newVehicleForm.model}
                    onChange={e => setNewVehicleForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. 3 Series"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">License Plate / Reg No</label>
                <input
                  type="text"
                  value={newVehicleForm.license_plate}
                  onChange={e => setNewVehicleForm(f => ({ ...f, license_plate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase"
                  placeholder="e.g. TN 75 B 9999"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Vehicle Type (For Pricing)</label>
                <select
                  value={newVehicleForm.vehicle_type_id}
                  onChange={e => setNewVehicleForm(f => ({ ...f, vehicle_type_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  <option value="">Select Vehicle Type</option>
                  {vehicleTypes.map(vt => (
                    <option key={vt.id} value={vt.id}>{vt.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-gray-900 rounded-xl shadow-xs"
                >
                  {savingVehicle ? 'Adding...' : 'Add & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS: CUSTOM SERVICE ITEM
      ────────────────────────────────────────────────────────────── */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Wrench size={16} className="text-[#E5B537]" /> Add Custom Service
              </h3>
              <button onClick={() => setShowCustomItemModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addCustomItem} className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Service / Item Name *</label>
                <input
                  type="text"
                  required
                  value={customItemForm.name}
                  onChange={e => setCustomItemForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  placeholder="e.g. Headlight Restoration"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={customItemForm.description}
                  onChange={e => setCustomItemForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  placeholder="e.g. UV protective clear coat"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={customItemForm.price}
                    onChange={e => setCustomItemForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                    placeholder="1500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={customItemForm.quantity}
                    onChange={e => setCustomItemForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-gray-900 rounded-xl shadow-xs"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WhatsApp Share Document Modal (Matching Invoice) ── */}
      {shareModalOpen && (
        <div 
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setShareModalOpen(false)}
        >
          <div 
            className="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="m-0 mb-1 text-xl font-black text-slate-900">Share Document</h3>
                <p className="m-0 text-xs text-slate-500">Send the Quotation PDF directly via WhatsApp or download it to your device.</p>
              </div>
              <button 
                onClick={() => setShareModalOpen(false)} 
                className="bg-slate-100 border-none p-1.5 rounded-full cursor-pointer text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xs">
                <FileText size={24} className="text-[#E5B537]" />
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-800 text-xs sm:text-sm">DetailingMasters-Quotation-{quotationNumber}.pdf</div>
                <div className="text-xs text-slate-500 mt-1">
                  PDF Document • {sharing ? 'Generating PDF...' : (shareFile ? `${(shareFile.size / 1024).toFixed(0)} KB` : 'Ready')}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => { setShareModalOpen(false); handleDownloadPDF(); }} 
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Download Only
              </button>
              <button 
                type="button"
                onClick={handleDirectShare} 
                disabled={!shareFile || sharing} 
                className="flex-1 py-2.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white border-none rounded-xl text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={15} />
                <span>Share Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
