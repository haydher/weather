export function UnitToggle({ unitPrimary, onChange }) {
  return (
    <div className="unit-toggle">
      <button
        type="button"
        className={unitPrimary === 'F' ? 'active' : 'inactive'}
        onClick={() => onChange('F')}
      >
        °F
      </button>
      <button
        type="button"
        className={unitPrimary === 'C' ? 'active' : 'inactive'}
        onClick={() => onChange('C')}
      >
        °C
      </button>
    </div>
  );
}
