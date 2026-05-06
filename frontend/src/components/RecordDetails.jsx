import React from 'react';
import { Download, FileText, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { generateInvoicePDF, generateQuotationPDF } from '../utils/billingGenerator';
import { useMonthFilter } from '../context/MonthFilterContext';
import './RecordDetails.css';

const RecordDetails = ({ data, type, onStatusChange }) => {
  const { monthYear, isFilterActive } = useMonthFilter();
  if (!data) return null;

  const formatDate = (val) => {
    if (val === true) return 'Yes / Active';
    if (val === false) return 'No / Inactive';
    if (val === 0) return '0';
    if (!val) return '—';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'string') {
      if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
      }
    }
    return val;
  };

  const [drillDownData, setDrillDownData] = React.useState(null);
  const [drillList,     setDrillList]     = React.useState([]);
  const [drillIndex,    setDrillIndex]    = React.useState(0);
  const [loadingHire,   setLoadingHire]   = React.useState(false);
  const [recoveredItems, setRecoveredItems] = React.useState([]);
  const [isRecovering,   setIsRecovering]   = React.useState(false);
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [localStatus,    setLocalStatus]    = React.useState(
    data.status || data.status_text || ''
  );

  const isGroup = data.isGrouped === true || data.isGrouped === 'true'
    || !!data.groupId
    || (data.vehicleNo && data.vehicleNo.includes(','));

  /* ── Parse a value that may be stored as "LKR 182,000" or 182000 ── */
  const parseAmount = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
  };

  // Aggregated data synthesis for Grouped Records
  const displayData = { ...data };
  if (isGroup) {
    const items = data.items?.length > 0 ? data.items : recoveredItems;
    if (items.length > 0) {
      if (!displayData.totalUnits || displayData.totalUnits === 0) {
        displayData.totalUnits = items.reduce((s, i) => s + (i.units || i.workingHours || 0), 0);
      }
      if (!displayData.site || displayData.site === '—') {
        displayData.site = [...new Set(items.map(i => i.city || i.address || '').filter(Boolean))].join(', ');
      }
      if (!displayData.startTime || displayData.startTime === '—') {
        displayData.startTime = [...items].sort((a,b) => (a.startTime||'99:99').localeCompare(a.startTime||'99:99'))[0]?.startTime;
      }
      if (!displayData.endTime || displayData.endTime === '—') {
        displayData.endTime = [...items].sort((a,b) => (b.endTime||'00:00').localeCompare(a.endTime||'00:00'))[0]?.endTime;
      }
      if (!displayData.jobDescription || displayData.jobDescription.includes('Batch Hire')) {
         displayData.jobDescription = `Consolidated Batch: ${items.length} Vehicles`;
      }
      // If totalAmount is 0, calculate it from items
      if (!parseAmount(displayData.totalAmount) && !parseAmount(displayData.hireAmount)) {
        displayData.totalAmount = items.reduce((s, i) => s + parseAmount(i.totalAmount || i.amount || 0), 0) + parseAmount(data.transportCharge || 0) + parseAmount(data.otherCharges || 0);
      }
    }
  }

  /* ── Auto-Recovery Logic for Legacy Records ── */
  React.useEffect(() => {
    const hasItems = (data.items && data.items.length > 0) || (data.originalHires && data.originalHires.length > 0);
    const isGroupRecord = data.isGrouped === true || data.isGrouped === 'true' || data.groupId || (data.vehicleNo && data.vehicleNo.includes(','));
    
    // We can recover if we have a groupId, OR if it's an invoice with an invoiceNo, OR if it's a payment with a date/client
    if (isGroupRecord && !hasItems && !recoveredItems.length && !isRecovering) {
      const recover = async () => {
        setIsRecovering(true);
        try {
          const res = await api.get('/hires');
          const allHires = Array.isArray(res.data) ? res.data : [];
          
          let matches = [];
          if (data.groupId) {
            matches = allHires.filter(h => h.groupId === data.groupId);
          } else if (data.invoiceNo || data.billNumber) {
            // Fallback: match by bill number
            const bNo = data.invoiceNo || data.billNumber;
            matches = allHires.filter(h => h.billNumber === bNo);
          } else if (data.date && (data.clientName || data.client)) {
             // Deep fallback: match by date and client
             const recordDateStr = new Date(data.date).toLocaleDateString();
             const cName = data.clientName || data.client;
             matches = allHires.filter(h => new Date(h.date).toLocaleDateString() === recordDateStr && (h.client === cName));
          }
          
          if (matches.length > 0) {
            setRecoveredItems(matches);
          } else {
             // Mark as tried to prevent infinite loop
            setRecoveredItems([]); 
          }
        } catch (err) {
          console.error("Recovery failed:", err);
          setRecoveredItems([]); 
        } finally {
          setIsRecovering(false);
        }
      };
      recover();
    }
  }, [data.groupId, data.invoiceNo, data.billNumber, data.date, data.clientName, data.client, data.isGrouped, data.vehicleNo, data.items, data.originalHires]);

  /* ── Inline status change with cross-module sync ─────────── */
  const handleStatusChange = async (newStatus) => {
    if (!data._id) return;
    setStatusUpdating(true);
    try {
      if (type === 'hire')    await api.put(`/hires/${data._id}`,    { status: newStatus });
      if (type === 'payment') await api.put(`/payments/${data._id}`, { status: newStatus });
      if (type === 'invoice') await api.put(`/invoices/${data._id}`, { status: newStatus });
      setLocalStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  /* ── Drill-down: click item row → open individual hire ──── */
  const handleItemClick = async (item, idx, allItems) => {
    const id = item.hireId || item._id;
    // Block only when viewing an individual (non-summary) hire to prevent infinite nesting
    if (!id) return;
    if (type === 'hire' && !data._isGroupSummary) return;
    // Don't re-open the same record UNLESS it's a summary record (where we want to see the specific item details)
    if (String(id) === String(data._id) && !data._isGroupSummary) return;

    setDrillList(allItems || []);
    setDrillIndex(idx || 0);
    setLoadingHire(true);
    try {
      const res = await api.get(`/hires/${id}`);
      setDrillDownData(res.data || { ...item });
    } catch {
      setDrillDownData({ ...item, _isGroupSummaryItem: true });
    } finally {
      setLoadingHire(false);
    }
  };

  /* ── Navigate prev/next inside a group ─────────────────── */
  const navigateDrill = async (newIdx) => {
    const item = drillList[newIdx];
    if (!item) return;
    const id = item.hireId || item._id;
    setDrillIndex(newIdx);
    setLoadingHire(true);
    try {
      const res = await api.get(`/hires/${id}`);
      setDrillDownData(res.data || { ...item });
    } catch {
      setDrillDownData({ ...item });
    } finally {
      setLoadingHire(false);
    }
  };

  if (drillDownData) {
    return (
      <div>
        {/* Navigation bar */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', borderRadius: '8px', padding: '8px 14px', border: '1px solid #BFDBFE' }}>
          <button
            className="secondary-btn"
            onClick={() => setDrillDownData(null)}
            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ChevronLeft size={14} /> Back to Summary
          </button>

          {drillList.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="secondary-btn"
                onClick={() => navigateDrill(drillIndex - 1)}
                disabled={drillIndex === 0 || loadingHire}
                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E40AF', minWidth: '72px', textAlign: 'center' }}>
                Hire {drillIndex + 1} / {drillList.length}
              </span>
              <button
                className="secondary-btn"
                onClick={() => navigateDrill(drillIndex + 1)}
                disabled={drillIndex === drillList.length - 1 || loadingHire}
                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {loadingHire ? 'Loading…' : `Vehicle: ${drillDownData?.vehicle || '—'}`}
          </span>
        </div>

        {loadingHire ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading hire details…</div>
        ) : (
          <div className="sub-item-view">
            <RecordDetails data={drillDownData} type="hire" onStatusChange={onStatusChange} />
          </div>
        )}
      </div>
    );
  }

  if (loadingHire && !drillDownData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="shimmer-loader" style={{ height: '80px', marginBottom: '16px' }}></div>
        <p style={{ color: '#64748B' }}>Loading hire details…</p>
      </div>
    );
  }

  const DetailSection = ({ title, fields }) => (
    <div className="detail-section">
      <h4 className="detail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {title === 'Financial Breakdown' || title === 'Payment Details' ? <Search size={18} /> : <FileText size={18} />}
        {title}
      </h4>
      <div className="detail-grid">
        {fields.map((f, i) => {
          let rawVal = data[f.key];
          
          // Ultra-robust fallback for any missing data
          if (rawVal === undefined || rawVal === null || rawVal === '' || rawVal === '—') {
            // First, try nested rawData (common for Salary/Payment records)
            if (data.rawData && data.rawData[f.key] !== undefined && data.rawData[f.key] !== null) {
              rawVal = data.rawData[f.key];
            }
            
            if (rawVal === undefined || rawVal === null || rawVal === '' || rawVal === '—') {
              const labelLower = f.label.toLowerCase();

            // Site/Address fallbacks
            if (labelLower.includes('site') || labelLower.includes('address') || labelLower.includes('location')) {
              rawVal = data.site || data.address || data.location || data.city || (data.items?.length > 0 ? [...new Set(data.items.map(i => i.city || i.address || '').filter(Boolean))].join(', ') : undefined);
            }
            // Client fallbacks
            else if (labelLower.includes('client') || labelLower.includes('company') || labelLower.includes('name')) {
              rawVal = data.clientName || data.client || data.name || data.company;
            }
            // Vehicle fallbacks
            else if (labelLower.includes('vehicle')) {
              rawVal = data.vehicleNo || data.vehicle;
            }
            // Time fallbacks
            else if (labelLower.includes('time')) {
              if (labelLower.includes('start')) rawVal = data.startTime || (data.items?.length > 0 ? data.items.sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''))[0]?.startTime : undefined);
              else if (labelLower.includes('end')) rawVal = data.endTime || (data.items?.length > 0 ? data.items.sort((a,b)=>(b.endTime||'').localeCompare(a.endTime||''))[0]?.endTime : undefined);
            }
            // Total Amount fallback for raw hire data (drill-down mode has no totalAmount_disp)
            else if (f.key === 'totalAmount_disp') {
              rawVal = data.billAmount || data.totalAmount ||
                (data.workingHours && data.oneHourFee
                  ? (Number(data.workingHours) * Number(data.oneHourFee))
                  : undefined);
            }
          }
        }

          const keyLower = f.key.toLowerCase();
          const isCurrency = (f.type === 'currency' || 
            keyLower.includes('salary') || 
            keyLower.includes('premium') || 
            keyLower.includes('rate') || 
            keyLower.includes('amount') || 
            keyLower.includes('fee') || 
            keyLower.includes('earnings') || 
            keyLower.includes('allowance') || 
            keyLower.includes('pay') || 
            keyLower.includes('incentive') || 
            keyLower.includes('advance') || 
            keyLower.includes('total') || 
            keyLower.includes('cost') ||
            keyLower.includes('commission') ||
            keyLower.includes('diesel') ||
            keyLower.includes('balance')) && !keyLower.includes('hours');

          let displayVal = rawVal;
          const isVehicleKey = f.key === 'vehicle' || f.key === 'vehicleNo' || f.label.toLowerCase().includes('vehicle');
          if (isVehicleKey && typeof displayVal === 'string' && displayVal.includes(',')) {
            displayVal = [...new Set(displayVal.split(',').map(v => v.trim()))].join(', ');
          }

          const isClickable = (f.key === 'hireId' || f.key === 'hireDetails') && (data.hireId || data._id);

          return (
            <div key={i} className="detail-field" onClick={() => isClickable && handleItemClick(data)} style={isClickable ? { cursor: 'pointer', borderBottom: '1px dashed #e2e8f0' } : {}}>
              <label>{f.label}</label>
              <p>
                {f.render ? f.render(rawVal) : 
                 (displayVal !== undefined && displayVal !== '' && displayVal !== null && displayVal !== '—'
                  ? (isCurrency && !isNaN(parseFloat(String(displayVal).replace(/[^0-9.-]/g, ''))))
                     ? `LKR ${parseFloat(String(displayVal).replace(/[^0-9.-]/g, '')).toLocaleString()}`
                     : formatDate(displayVal) 
                  : '—')}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const hireFields = [
    { title: 'Basic Information', fields: [
      { label: 'Date', key: 'date' },
      { label: 'Bill Number', key: 'billNumber' },
      { label: 'Time Sheet No', key: 'timeSheetNumber' },
      { label: 'Company Name', key: 'client' },
      { label: 'Vehicle Number', key: 'vehicle' },
      { label: 'Service Address', key: 'address' },
      { label: 'City', key: 'city' }
    ]},
    { title: 'Personnel', fields: [
      { label: 'Driver Name', key: 'driverName' },
      { label: 'Helper Name', key: 'helperName' }
    ]},
    { title: 'Time Tracking', fields: [
      { label: 'Start Time', key: 'startTime' },
      { label: 'End Time', key: 'endTime' },
      { label: 'Rest (min)', key: 'restTime' },
      { label: 'Working Hours', key: 'workingHours' }
    ]},
    { title: 'Financial Breakdown', fields: [
      { label: 'Min Hours', key: 'minimumHours' },
      { label: 'One Hour Fee', key: 'oneHourFee' },
      { label: 'Extra Hours', key: 'extraHours' },
      { label: 'Extra Hour Fee', key: 'extraHourFee' },
      { label: 'Transport Fee', key: 'transportFee' },
      { label: 'Fuel Cost', key: 'dieselCost' },
      { label: 'Commission', key: 'commission' },
      { label: 'Total Amount', key: 'totalAmount_disp' }
    ]},
    { title: 'Additional Details', fields: [
        { label: 'Notes', key: 'details' },
        { label: 'Status', key: 'status_text' }
    ]}
  ];

  const paymentFields = [
    { title: 'Job Information', fields: [
      { label: 'Date',          key: 'date' },
      { label: 'Company',       key: 'client' },
      { label: 'Vehicle No',    key: 'vehicle' },
      { label: 'City',          key: 'city' },
      { label: 'Address',       key: 'address' },
    ]},
    { title: 'Time Tracking', fields: [
      { label: 'Start Time',       key: 'startTime' },
      { label: 'End Time',         key: 'endTime' },
      { label: 'Rest Time (min)',   key: 'restTime' },
      { label: 'Total Hours',      key: 'totalHours' },
      { label: 'Minimum Hours',    key: 'minimumHours' },
      { label: 'Hours in Bill',    key: 'hoursInBill' },
    ]},
    { title: 'Financial Breakdown', fields: [
      { label: 'Hire Amount',    key: 'hireAmount' },
      { label: 'Commission',     key: 'commission' },
      { label: 'Day Payment',    key: 'dayPayment' },
      { label: 'Taken Amount',   key: 'takenAmount' },
      { label: 'Balance',        key: 'balance' },
      { label: 'Status',         key: 'status_text' },
      { label: 'Is Grouped?',    key: 'isGrouped' }
    ]},
  ];

  const invoiceFields = [
    { title: 'Billing Details', fields: [
      { label: 'Invoice Number', key: 'invoiceNo' },
      { label: 'Date', key: 'date' },
      { label: 'Client', key: 'clientName' },
      { label: 'Site', key: 'site' },
      { label: 'Vehicle', key: 'vehicleNo' }
    ]},
    { title: 'Job Information', fields: [
      { label: 'Description', key: 'jobDescription' },
      { label: 'Start Time', key: 'startTime' },
      { label: 'End Time', key: 'endTime' }
    ]},
    { title: 'Pricing Breakdown', fields: [
      { label: 'Total Units (Hours)', key: 'totalUnits' },
      { label: 'Rate / Unit', key: 'ratePerUnit' },
      { label: 'Transport Charge', key: 'transportCharge' },
      { label: 'Other Charges', key: 'otherCharges' },
      { label: 'Grand Total', key: 'totalAmount' },
      { label: 'Status', key: 'status' }
    ]}
  ];

  const quotationFields = [
    { title: 'Quotation Basics', fields: [
      { label: 'Quote Number', key: 'quotationNo' },
      { label: 'Date', key: 'date' },
      { label: 'Client Name', key: 'clientName' },
      { label: 'Validity', key: 'validityDays' }
    ]},
    { title: 'Vehicle Specifications', fields: [
      { label: 'Vehicle Type', key: 'vehicleType' },
      { label: 'Vehicle No', key: 'vehicleNo' },
      { label: 'Max Height', key: 'maxHeight' },
      { label: 'Max Weight', key: 'maxWeight' }
    ]},
    { title: 'Pricing Offer', fields: [
      { label: 'Min Charge', key: 'mandatoryCharge' },
      { label: 'Transport', key: 'transportCharge' },
      { label: 'Extra Hr Rate', key: 'extraHourRate' },
      { label: 'Estimated Total', key: 'estimatedTotal' },
      { label: 'Status', key: 'status' }
    ]},
    { title: 'Terms & Conditions', fields: [
      { label: 'Terms', key: 'termsAndConditions' }
    ]}
  ];

  const dieselFields = [
    { title: 'Fueling Details', fields: [
      { label: 'Date', key: 'date' },
      { label: 'Vehicle', key: 'vehicle' },
      { label: 'Driver / Staff', key: 'employee' }
    ]},
    { title: 'Consumption', fields: [
      { label: 'Liters', key: 'liters' },
      { label: 'Price / L', key: 'pricePerLiter' },
      { label: 'Total Cost', key: 'total' },
      { label: 'Odometer', key: 'odometer' }
    ]},
    { title: 'Management', fields: [
      { label: 'Notes', key: 'note' },
      { label: 'Status', key: 'status' }
    ]}
  ];
  
  const salaryFields = [
    { title: 'Employee Information', fields: [
      { label: 'Pay Month', key: 'month' },
      { label: 'Employee Name', key: 'employee' },
      { label: 'Jobs Done', key: 'jobsCount' },
      { label: 'Working Days', key: 'workingDays' },
      { label: 'Total Hours', key: 'totalHours' }
    ]},
    { title: 'Earnings Breakdown', fields: [
      { label: 'Basic Salary', key: 'basic' },
      { label: 'Hourly Earnings', key: 'hourlyEarnings' },
      { label: 'Daily Allowance', key: 'dailyAllowance' },
      { label: 'Attendance Bonus', key: 'attendanceBonus' },
      { label: 'Attendance Penalty', key: 'attendancePenalty' },
      { label: 'Incentives (Manual)', key: 'incentive' },
      { label: 'Advance Deductions', key: 'advance' },
      { label: 'Final Net Payable', key: 'netPay' }
    ]}
  ];

  const employeeFields = [
    { title: 'Personal Information', fields: [
      { label: 'Full Name', key: 'name' },
      { label: 'NIC Number', key: 'nic' },
      { label: 'Contact Number', key: 'contact' },
      { label: 'Role', key: 'role' },
      { label: 'Status', key: 'status' }
    ]},
    { title: 'Performance Statistics', fields: [
      { 
        label: isFilterActive ? `Jobs in ${monthYear}` : 'Career Jobs Done', 
        key: 'totalJobs',
        render: (val) => <span style={{ fontWeight: 800, color: '#2563EB', fontSize: '1rem' }}>{val || 0} Jobs</span>
      },
      { 
        label: isFilterActive ? `Presence in ${monthYear}` : 'Career Working Days', 
        key: 'totalWorkingDays',
        render: (val) => <span style={{ fontWeight: 800, color: '#10B981', fontSize: '1rem' }}>{val || 0} Days Present</span>
      }
    ]},
    { title: 'Employment Details', fields: [
      { label: 'Joined Date', key: 'joinedDate' },
      { label: 'Salary Structure', key: 'salaryType' },
      ...(data.salaryType === 'Daily' 
          ? [{ label: 'Daily Wage Rate', key: 'dailyWage' }] 
          : [{ label: 'Basic Salary (Monthly)', key: 'basicSalary' }]),
      { label: 'Hourly Rate (Hires)', key: 'hourlyRate' }
    ]},
    { title: 'System Access', fields: [
      { label: 'Username', key: 'username' }
    ]}
  ];

  const clientFields = [
    { title: 'Client Information', fields: [
      { label: 'Client Name', key: 'name' },
      { label: 'Contact Number', key: 'contact' },
      { label: 'Email', key: 'email' },
      { label: 'Address', key: 'address' }
    ]},
    { title: 'Financial Summary', fields: [
      { label: 'Total Hires', key: 'totalHires' },
      { label: 'Outstanding Balance', key: 'outstanding' },
      { label: 'Status', key: 'status' }
    ]}
  ];

  const vehicleFields = [
    { title: 'Vehicle Information', fields: [
      { label: 'Vehicle Number', key: 'number' },
      { label: 'Vehicle Type', key: 'type' },
      { label: 'Model', key: 'model' },
      { label: 'Fuel Type', key: 'fuelType' },
      { label: 'One Hour Rate', key: 'hourlyRate' },
    ]},
    { title: 'Leasing & Finance', fields: [
      { label: 'Leasing Status', key: 'hasLeasing' },
      { label: 'Leasing Company', key: 'leasingCompany' },
      { label: 'Monthly Premium', key: 'monthlyPremium' },
      { label: 'Payment Due Day', key: 'leaseDueDate' },
      { label: 'Lease Start Date', key: 'leaseStartDate' },
      { label: 'Final Payment Date', key: 'leaseFinalDate' }
    ]},
    { title: 'Speed Draft Details', fields: [
      { label: 'Speed Draft Status', key: 'hasSpeedDraft' },
      { label: 'Speed Draft Company', key: 'speedDraftCompany' },
      { label: 'Monthly Premium', key: 'speedDraftMonthlyPremium' },
      { label: 'Payment Due Day', key: 'speedDraftDueDate' },
      { label: 'Draft Start Date', key: 'speedDraftStartDate' },
      { label: 'Final Payment Date', key: 'speedDraftFinalDate' }
    ]},
    { title: 'Compliance & Renewals', fields: [
      { label: 'Insurance Expiration', key: 'insuranceExpirationDate' },
      { label: 'License Expiration', key: 'licenseExpirationDate' },
      { label: 'Safety Certificate Expiry', key: 'safetyExpirationDate' }
    ]},
    { title: 'Status', fields: [
      { label: 'Current Status', key: 'status' }
    ]}
  ];

  const extraIncomeFields = [
    { title: 'Job Information', fields: [
      { label: 'Date', key: 'date' },
      { label: 'Job Type', key: 'jobType' },
      { label: 'Description', key: 'description' },
      { label: 'Amount', key: 'amount' }
    ]},
    { title: 'Location Details', fields: [
      { label: 'Address / Site', key: 'address' },
      { label: 'Building / Location', key: 'location' }
    ]},
    { title: 'Resources', fields: [
      { label: 'Vehicle Number', key: 'vehicle' },
      { label: 'Staff Involved', key: 'employees' }
    ]},
    { title: 'Additional Details', fields: [
      { label: 'Notes', key: 'note' }
    ]}
  ];

  const expenseFields = [
    { title: 'Expense Details', fields: [
      { label: 'Date', key: 'date' },
      { label: 'Description', key: 'description' },
      { label: 'Category', key: 'category' },
      { label: 'Amount', key: 'amount' },
      { label: 'Notes', key: 'note' }
    ]}
  ];

  const serviceFields = [
    { title: 'Service Information', fields: [
      { label: 'Service Date', key: 'date' },
      { label: 'Vehicle Number', key: 'vehicleNumber' },
      { label: 'Current Mileage', key: 'currentMileage' },
      { label: 'Service Cost', key: 'cost' }
    ]},
    { title: 'Renewal / Schedule', fields: [
      { label: 'Next Service Date', key: 'nextServiceDate' },
      { label: 'Next Service Mileage', key: 'nextServiceMileage' }
    ]},
    { title: 'Technical Details', fields: [
      { label: 'Items / Details', key: 'details' },
      { label: 'Additional Notes', key: 'note' }
    ]}
  ];

  const maintenanceFields = [
    { title: 'General Info', fields: [
      { label: 'Date', key: 'date' },
      { label: 'Vehicle Number', key: 'vehicleNumber' },
      { label: 'Type', key: 'type' }
    ]},
    { title: 'Maintenance Details', fields: [
      { label: 'Description', key: 'description' },
      { label: 'Cost (LKR)', key: 'cost' }
    ]},
    { title: 'Notes', fields: [
      { label: 'Remarks', key: 'notes' }
    ]}
  ];

  const sectionsMap = {
    'hire': hireFields,
    'payment': paymentFields,
    'diesel': dieselFields,
    'invoice': invoiceFields,
    'quotation': quotationFields,
    'salary': salaryFields,
    'employee': employeeFields,
    'client': clientFields,
    'vehicle': vehicleFields,
    'extraIncome': extraIncomeFields,
    'expense': expenseFields,
    'services': serviceFields,
    'maintenance': maintenanceFields
  };

  const sections = sectionsMap[type] || [];

  /* ── Status options per type ──────────────────────────────── */
  const statusOptions = {
    hire:    ['Pending', 'Completed', 'Paid'],
    payment: ['Pending', 'Partial',   'Paid'],
    invoice: ['Draft',   'Sent',      'Paid', 'Cancelled'],
  };
  const statusColors = {
    Pending: '#F59E0B', Partial: '#3B82F6', Completed: '#10B981',
    Paid: '#10B981', Draft: '#94A3B8', Sent: '#6366F1', Cancelled: '#EF4444'
  };
  const currentStatusOpts = statusOptions[type] || [];

  return (
    <div className="details-overlay">
      {/* Inline status changer — for hire, payment, invoice */}
      {currentStatusOpts.length > 0 && data._id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</span>
          {currentStatusOpts.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={statusUpdating}
              style={{
                padding: '3px 12px',
                borderRadius: '20px',
                border: `2px solid ${statusColors[s] || '#CBD5E1'}`,
                background: localStatus === s ? (statusColors[s] || '#CBD5E1') : 'white',
                color: localStatus === s ? 'white' : (statusColors[s] || '#475569'),
                fontWeight: '700',
                fontSize: '0.72rem',
                cursor: statusUpdating ? 'not-allowed' : 'pointer',
                opacity: statusUpdating ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {s}
            </button>
          ))}
          {statusUpdating && <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Syncing…</span>}
        </div>
      )}

      {(type === 'invoice' || type === 'quotation') && (
        <div className="detail-actions-header">
          <button
            className="download-pdf-btn"
            onClick={() => type === 'invoice' ? generateInvoicePDF({ ...data, items: data.items && data.items.length > 0 ? data.items : recoveredItems }) : generateQuotationPDF(data)}
          >
            <Download size={18} /> <span>Download Professional PDF</span>
          </button>
        </div>
      )}

      {/* Consolidated Record Overview — only for grouped summaries, not individual hires */}
      {(data._isGroupSummary === true || (isGroup && type !== 'hire')) && (
        <div className="detail-section" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 16px', marginBottom: '4px' }}>
          <h4 style={{ color: '#1E40AF', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <FileText size={18} /> Consolidated Record Overview
          </h4>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 'bold' }}>All Vehicles</label>
              <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>{[...new Set((data.vehicleNo || data.vehicle || '').split(',').map(v => v.trim()))].join(', ')}</p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 'bold' }}>Service Range</label>
              <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>
                {(data.startTime || (recoveredItems?.length > 0 ? recoveredItems.sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''))[0]?.startTime : '—'))} to {(data.endTime || (recoveredItems?.length > 0 ? recoveredItems.sort((a,b)=>(b.endTime||'').localeCompare(a.endTime||''))[0]?.endTime : '—'))}
              </p>
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 'bold' }}>All Sites</label>
              <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>
                {data.site || data.address || (recoveredItems?.length > 0 ? [...new Set(recoveredItems.map(i => i.city || i.address || '').filter(Boolean))].join(', ') : 'Multiple Sites')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Itemized Breakdown — for grouped records OR records with items */}
      {(data._isGroupSummary === true || (data.groupId && type !== 'hire') || (isGroup && ((data.items && data.items.length > 0) || (data.originalHires && data.originalHires.length > 0) || recoveredItems.length > 0))) && (
        <div className="detail-section" style={{ marginTop: '0px', marginBottom: '8px' }}>
          <h4 className="detail-section-title" style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} /> Itemized Breakdown
          </h4>
          <div style={{ overflowX: 'auto', marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #E2E8F0', color: '#64748B', background: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', width: '70px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Vehicle / Description</th>
                  <th style={{ padding: '10px 12px' }}>Site / Time</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {isRecovering ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#2563EB', fontSize: '0.8rem', background: '#F8FAFC' }}>
                      <div className="shimmer-loader" style={{ height: '20px', width: '150px', margin: '0 auto 10px' }}></div>
                      Recovering breakdown details…
                    </td>
                  </tr>
                ) : (() => {
                  const allItems = (data.originalHires?.length ? data.originalHires : null) || 
                                   (data.items?.length ? data.items : null) || 
                                   recoveredItems || [];
                  return allItems.length > 0 ? allItems.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: (item.hireId || item._id) ? 'pointer' : 'default', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                    onClick={() => handleItemClick(item, idx, allItems)}
                    className="hover-row"
                    title="Click to view full details for this hire"
                  >
                    <td style={{ padding: '10px 12px', width: '70px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '24px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '6px', fontSize: '11px', fontWeight: '800', border: '1px solid #BFDBFE' }}>
                        Hire {idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1E293B' }}>{item.vehicle || item.description || 'Service Entry'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{item.vehicleType || ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#1E293B' }}>{item.city || item.address || 'Main Site'}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.startTime} {item.startTime && '–'} {item.endTime} {item.workingHours ? `(${item.workingHours}h)` : ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                      LKR {(item.totalAmount || item.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', background: '#F8FAFC' }}>
                      Breakdown details not available for this record.
                    </td>
                  </tr>
                );
                })()}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 'bold', borderTop: '2px solid #E2E8F0' }}>
                  <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>NET CONSOLIDATED TOTAL:</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#2563EB', fontSize: '1rem' }}>
                    {(() => {
                      const allItems = (data.originalHires?.length ? data.originalHires : null) || 
                                       (data.items?.length ? data.items : null) || 
                                       recoveredItems || [];
                      const sumFromItems = allItems.length > 0
                        ? allItems.reduce((s, i) => s + parseAmount(i.totalAmount || i.amount || 0), 0)
                        : parseAmount(displayData.totalAmount || displayData.billAmount || displayData.hireAmount || 0);
                      return `LKR ${sumFromItems.toLocaleString()}`;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {sections.map((s, i) => <DetailSection key={i} title={s.title} fields={s.fields} />)}

      {/* Helper Shift Breakdown */}
      {type === 'salary' && (data.role === 'Helper' || data.rawData?.role === 'Helper') && (data.shifts || data.rawData?.shifts) && (
        <div className="detail-section" style={{ marginTop: '20px' }}>
          <h4 className="detail-section-title">Helper Shift Breakdown (One by One)</h4>
          <div style={{ overflowX: 'auto', marginTop: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Shift</th>
                  <th style={{ padding: '8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.shifts || data.rawData?.shifts).map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px' }}>{new Date(s.date).toLocaleDateString()}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem',
                        backgroundColor: s.shift === 'Morning' ? '#DBEAFE' : '#FEF3C7',
                        color: s.shift === 'Morning' ? '#1E40AF' : '#92400E'
                      }}>
                        {s.shift}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: '600' }}>LKR {s.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>Total Shift Earnings:</td>
                  <td style={{ padding: '8px' }}>LKR {(data.shifts || data.rawData?.shifts).reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordDetails;
