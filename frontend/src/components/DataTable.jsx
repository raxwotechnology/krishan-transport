import React from 'react';
import './DataTable.css';

const DataTable = ({ columns, data, emptyMessage, loading }) => {
  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + 1} className="loading-cell">
                <div className="shimmer-loader"></div>
              </td>
            </tr>
          ) : data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => {
                  const key = col.toLowerCase().replace(/#| |\/L/g, '').replace('liters', 'liters').replace('price', 'pricePerLiter').replace('amount', 'amount').replace('commission', 'commission').replace('bill', 'billNumber').replace('month', 'month').replace('employee', 'employee').replace('vehicle', 'vehicle').replace('location', 'location').replace('basic', 'basic').replace('incentive', 'incentive').replace('advance', 'advance').replace('netpay', 'netPay').replace('hireamount', 'hireAmount').replace('paidamount', 'paidAmount').replace('balance', 'balance').replace('status', 'status').replace('action', 'action');
                  
                  // Handle mapping based on common keys
                  const fieldMap = {
                    'DATE': 'date',
                    'CLIENT': 'client',
                    'VEHICLE': 'vehicle',
                    'LOCATION': 'location',
                    'AMOUNT': 'amount',
                    'COMMISSION': 'commission',
                    'BILL#': 'billNumber',
                    'MONTH': 'month',
                    'EMPLOYEE': 'employee',
                    'BASIC': 'basic',
                    'INCENTIVE': 'incentive',
                    'ADVANCE': 'advance',
                    'NET PAY': 'netPay',
                    'PAID': 'paidAmount',
                    'ACTION': 'action',
                    'LITERS': 'liters',
                    'PRICE/L': 'pricePerLiter',
                    'TOTAL': 'total',
                    'ODOMETER': 'odometer',
                    'NOTE': 'note',
                    'HIRE AMT': 'hireAmount',
                    'PAID AMT': 'paidAmount',
                    'BALANCE': 'balance',
                    'STATUS': 'status',
                    'CLIENT NAME': 'name',
                    'CONTACT': 'contact',
                    'TOTAL HIRES': 'totalHires',
                    'OUTSTANDING': 'outstanding',
                    'VEHICLE NUMBER': 'number',
                    'NAME': 'name',
                    'NIC': 'nic',
                    'ROLE': 'role',
                    'JOINED': 'joined',
                    'STATUS': 'status'
                  };
                  
                  const keyToUse = fieldMap[col] || col.toLowerCase();
                  return <td key={colIndex}>{row[keyToUse]}</td>;
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="empty-row">
                <div className="empty-content">
                  <div className="empty-icon">📂</div>
                  <p>{emptyMessage || 'No records found.'}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
