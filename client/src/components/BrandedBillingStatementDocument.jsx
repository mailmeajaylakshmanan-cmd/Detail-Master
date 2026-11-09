import React from 'react';
import StandardDocumentLayout from './StandardDocumentLayout.jsx';
import { parseSafeDate } from '../utils/dateFormatter.js';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  const parsed = parseSafeDate(d);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BrandedBillingStatementDocument({
  customerName = '',
  phone = '',
  address = '',
  email = '',
  isOrganization = false,
  contactPerson = '',
  periodLabel = 'All Time',
  summary = {},
  invoices = [],
}) {
  const isPaidInFull = (Number(summary.totalOutstanding) || 0) <= 0;

  return (
    <StandardDocumentLayout
      documentId="statement-print"
      documentTitle="STATEMENT"
      titleFontSize={26}
      titlePaddingRight="24px"
      wrapStyle={{
        height: 'auto',
        minHeight: '296mm',
        background: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        boxShadow: 'none',
        border: '1px solid #E2E8F0',
      }}
    >
      <div style={styles.body}>
        {/* Customer & Statement Meta Section */}
        <div style={styles.metaRow}>
          {/* Left: Customer Info */}
          <div style={styles.clientBox}>
            <div style={styles.sectionHeading}>
              {isOrganization ? 'BILLED TO (ORGANIZATION)' : 'BILLED TO (CUSTOMER)'}
            </div>
            <div style={styles.clientName}>{customerName || 'Valued Customer'}</div>
            {contactPerson && (
              <div style={styles.clientDetail}>
                <span style={styles.label}>Contact Person:</span> {contactPerson}
              </div>
            )}
            {phone && (
              <div style={styles.clientDetail}>
                <span style={styles.label}>Phone:</span> {phone}
              </div>
            )}
            {email && (
              <div style={styles.clientDetail}>
                <span style={styles.label}>Email:</span> {email}
              </div>
            )}
            {address && (
              <div style={styles.clientDetail}>
                <span style={styles.label}>Address:</span> {address}
              </div>
            )}
          </div>

          {/* Right: Statement Box */}
          <div style={styles.statementBox}>
            <div style={styles.sectionHeading}>STATEMENT OF ACCOUNT</div>
            <div style={styles.metaLine}>
              <span style={styles.label}>Statement Date:</span>
              <span style={{ fontWeight: 600 }}>{fmtDate(new Date())}</span>
            </div>
            <div style={styles.metaLine}>
              <span style={styles.label}>Statement Period:</span>
              <span style={{ fontWeight: 600 }}>{periodLabel}</span>
            </div>
            <div style={styles.metaLine}>
              <span style={styles.label}>Total Invoices:</span>
              <span style={{ fontWeight: 600 }}>{summary.invoiceCount || invoices.length}</span>
            </div>
            {summary.totalVehicles ? (
              <div style={styles.metaLine}>
                <span style={styles.label}>Vehicles Serviced:</span>
                <span style={{ fontWeight: 600 }}>{summary.totalVehicles}</span>
              </div>
            ) : null}

            <div style={styles.dueHighlight}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: isPaidInFull ? '#047857' : '#991B1B', fontWeight: 800 }}>
                {isPaidInFull ? 'ACCOUNT STATUS' : 'NET OUTSTANDING BALANCE'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: isPaidInFull ? '#047857' : '#991B1B', marginTop: 2 }}>
                {isPaidInFull ? 'PAID IN FULL (₹0.00)' : `₹${fmt(summary.totalOutstanding)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Breakdown Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, width: '5%', textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: '13%' }}>DATE</th>
                <th style={{ ...styles.th, width: '18%' }}>INVOICE NO</th>
                <th style={{ ...styles.th, width: '22%' }}>VEHICLE</th>
                <th style={{ ...styles.th, width: '18%' }}>SERVICES</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'right' }}>BILLED</th>
                <th style={{ ...styles.th, width: '12%', textAlign: 'right' }}>PAID</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.emptyTd}>
                    No invoices recorded for this period.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const veh = inv.vehicles?.[0]
                    ? `${inv.vehicles[0].makeModel || ''} ${inv.vehicles[0].licenseVin ? `(${inv.vehicles[0].licenseVin})` : ''}`.trim()
                    : '—';
                  const svcs = (inv.services || []).join(', ') || 'Detailing Service';
                  const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                  const hasDue = (Number(inv.balance_due) || 0) > 0;

                  return (
                    <tr key={inv.id || idx} style={{ ...styles.tr, backgroundColor: rowBg }}>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#64748B', fontSize: 10 }}>{idx + 1}</td>
                      <td style={{ ...styles.td, color: '#334155', whiteSpace: 'nowrap' }}>{fmtDate(inv.created_at)}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>
                        {inv.invoice_number}
                        {hasDue && (
                          <span style={{ display: 'inline-block', marginLeft: 4, color: '#B91C1C', fontSize: 9, fontWeight: 700 }}>
                            (Due: ₹{fmt(inv.balance_due)})
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.td, fontSize: 10.5, color: '#1E293B', fontWeight: 500 }}>{veh}</td>
                      <td style={{ ...styles.td, fontSize: 10, color: '#475569' }}>{svcs}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        ₹{fmt(inv.grand_total)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#047857', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ₹{fmt(inv.amount_paid)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={styles.tfootRow}>
                <td colSpan="5" style={{ ...styles.tdTotal, textAlign: 'right', color: '#0F172A' }}>
                  GRAND TOTALS:
                </td>
                <td style={{ ...styles.tdTotal, textAlign: 'right', color: '#0F172A' }}>
                  ₹{fmt(summary.totalBilled || summary.totalRevenue)}
                </td>
                <td style={{ ...styles.tdTotal, textAlign: 'right', color: '#047857' }}>
                  ₹{fmt(summary.totalPaid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Financial Reconciliation Summary */}
        <div style={styles.bottomSection}>
          <div style={styles.notesBox}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#0F172A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PAYMENT & ACCOUNT TERMS
            </div>
            <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.55 }}>
              • All services performed with genuine ceramic formulations and detailing care.<br />
              • UPI / GPay / PhonePe Transfer: <strong>9111977721</strong> (Detailing Masters).<br />
              • For any statement billing queries, reach us at <strong>+91 9111977721</strong> or <strong>detailingmasters2024@gmail.com</strong>.
            </div>
          </div>

          <div style={styles.grandSummaryBox}>
            <div style={styles.summaryLine}>
              <span>Gross Total Billed:</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{fmt(summary.totalBilled || summary.totalRevenue)}</span>
            </div>
            <div style={styles.summaryLine}>
              <span>Total Amount Paid:</span>
              <span style={{ fontWeight: 700, color: '#047857' }}>₹{fmt(summary.totalPaid)}</span>
            </div>
            <div style={{ ...styles.summaryLine, borderTop: '1.5px solid #CBD5E1', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 12 }}>Net Balance Due:</span>
              <span style={{ fontWeight: 900, fontSize: 14, color: isPaidInFull ? '#047857' : '#B91C1C' }}>
                ₹{fmt(summary.totalOutstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Authorized Signatory */}
        <div style={styles.signSection}>
          <div style={styles.signLine} />
          <div style={{ fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.05em' }}>
            AUTHORIZED SIGNATORY
          </div>
          <div style={{ fontSize: 9, color: '#64748B' }}>Detailing Masters Studio</div>
        </div>
      </div>
    </StandardDocumentLayout>
  );
}

const styles = {
  body: {
    padding: '20px 36px 12px 36px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    position: 'relative',
    zIndex: 1,
    background: '#FFFFFF',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  clientBox: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  statementBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  sectionHeading: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 6,
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 800,
    color: '#0F172A',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 10.5,
    color: '#334155',
    marginBottom: 2.5,
  },
  metaLine: {
    fontSize: 10.5,
    color: '#334155',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontWeight: 700,
    color: '#64748B',
  },
  dueHighlight: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px dashed #CBD5E1',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: '6px 8px',
  },
  tableWrap: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 10.5,
  },
  thRow: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  th: {
    padding: '8px 10px',
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textAlign: 'left',
    color: '#F8FAFC',
  },
  tr: {
    borderBottom: '1px solid #E2E8F0',
  },
  td: {
    padding: '7px 10px',
    color: '#1E2937',
    fontSize: 10.5,
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: 24,
    textAlign: 'center',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  tfootRow: {
    backgroundColor: '#F1F5F9',
    borderTop: '2px solid #CBD5E1',
  },
  tdTotal: {
    padding: '8px 10px',
    fontWeight: 900,
    fontSize: 11,
  },
  bottomSection: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  notesBox: {
    flex: 1.3,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '10px 12px',
  },
  grandSummaryBox: {
    flex: 0.9,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #CBD5E1',
    borderRadius: 8,
    padding: '10px 14px',
  },
  summaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10.5,
    color: '#334155',
    marginBottom: 3.5,
  },
  signSection: {
    alignSelf: 'flex-end',
    width: 170,
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 4,
  },
  signLine: {
    width: '100%',
    borderBottom: '1.5px solid #64748B',
    marginBottom: 4,
  },
};
