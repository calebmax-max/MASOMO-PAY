import React from 'react';
import { calculateBalance, formatCurrency } from '../utils/helpers';

const AVATAR_COLORS = [
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FBEAF0', fg: '#72243E' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function getAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default function StudentCard({ student, onEdit, onDelete, onPay, index = 0 }) {
  const balance = calculateBalance(student);
  const { bg, fg } = getAvatarColor(index);
  const isOwed = balance > 0;

  return (
    <li style={s.row}>
      {/* Avatar + name */}
      <div style={s.studentInfo}>
        <div style={{ ...s.avatar, background: bg, color: fg }}>
          {getInitials(student.name)}
        </div>
        <div style={s.nameBlock}>
          <p style={s.name}>{student.name}</p>
          {student.admission_no && <p style={s.adm}>{student.admission_no}</p>}
        </div>
      </div>

      {/* Class */}
      <span style={s.cell}>{student.class_name || '—'}</span>

      {/* Balance */}
      <span style={{ ...s.balance, ...(isOwed ? s.balanceOwed : {}) }}>
        {formatCurrency(balance)}
      </span>

      {/* Actions */}
      <div style={s.actions}>
        <button
          type="button"
          style={{ ...s.btn, ...s.btnPay }}
          onClick={() => onPay?.(student)}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#B5D4F4')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#E6F1FB')}
        >
          Pay
        </button>
        <button
          type="button"
          style={s.btn}
          onClick={() => onEdit?.(student)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Edit
        </button>
        <button
          type="button"
          style={{ ...s.btn, ...s.btnDelete }}
          onClick={() => onDelete?.(student)}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FCEBEB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

const s = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 90px 100px 160px',
    gap: 12,
    alignItems: 'center',
    padding: '10px 1.25rem',
    borderBottom: '0.5px solid #2A2A38',
    listStyle: 'none',
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 500,
    flexShrink: 0,
  },
  nameBlock: {
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F0F0F2',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  adm: {
    fontSize: 11,
    color: '#7A7A8C',
    margin: '1px 0 0',
  },
  cell: {
    fontSize: 12,
    color: '#7A7A8C',
  },
  balance: {
    fontSize: 13,
    fontWeight: 500,
    color: '#5DCAA5',
  },
  balanceOwed: {
    color: '#F09595',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 6,
    cursor: 'pointer',
    border: '0.5px solid #2A2A38',
    background: 'transparent',
    color: '#7A7A8C',
    transition: 'background 0.1s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  btnPay: {
    borderColor: '#1A4A6A',
    color: '#7BB8F4',
    background: '#0F1E2E',
  },
  btnDelete: {
    borderColor: '#7B2020',
    color: '#F09595',
  },
};