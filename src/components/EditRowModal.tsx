import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, AlertTriangle } from 'lucide-react';

interface EditRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: any;
  columns: any[];
  pkColumn: string | null;
  onUpdate: (updates: any) => Promise<void>;
  onDelete: () => Promise<void>;
}

const EditRowModal: React.FC<EditRowModalProps> = ({
  isOpen,
  onClose,
  row,
  columns,
  pkColumn,
  onUpdate,
  onDelete,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [nullFields, setNullFields] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (row) {
      const initialData: any = {};
      const initialNulls = new Set<string>();
      columns.forEach(c => {
        const val = row[c.name];
        if (val === null || val === undefined) {
          initialNulls.add(c.name);
          initialData[c.name] = '';
        } else {
          initialData[c.name] = String(val);
        }
      });
      setFormData(initialData);
      setNullFields(initialNulls);
      setIsDeleting(false);
    }
  }, [row, columns]);

  if (!isOpen || !row) return null;

  const handleInputChange = (col: string, val: string) => {
    setFormData({ ...formData, [col]: val });
    if (nullFields.has(col)) {
      const newNulls = new Set(nullFields);
      newNulls.delete(col);
      setNullFields(newNulls);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const updates: any = {};
    Object.entries(formData).forEach(([col, val]) => {
      updates[col] = nullFields.has(col) ? null : val;
    });
    await onUpdate(updates);
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
      return;
    }
    await onDelete();
  };

  const pkVal = pkColumn ? row[pkColumn] : '?';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex' }}>
      <div className="modal modal-edit" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Row {pkColumn && `— ${pkColumn}: ${pkVal}`}</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body edit-modal-body">
          {columns.map((c) => {
            const isNull = nullFields.has(c.name);
            return (
              <div key={c.name} className="edit-field-row">
                <label className="edit-field-label" htmlFor={`edit-field-${c.name}`}>
                  {c.name} {isNull && <span className="edit-field-null-tag">NULL</span>}
                </label>
                <input 
                  type="text" 
                  className={`edit-field-input ${isNull ? 'is-null' : ''}`}
                  id={`edit-field-${c.name}`}
                  value={formData[c.name]}
                  onChange={(e) => handleInputChange(c.name, e.target.value)}
                  placeholder={isNull ? 'NULL' : ''}
                />
              </div>
            );
          })}
        </div>
        <div className="modal-footer">
          <button 
            className={`btn-danger btn-sm ${isDeleting ? 'confirming' : ''}`}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <><AlertTriangle size={13} strokeWidth={2.5} style={{ marginRight: '5px' }} /> Confirm Delete?</>
            ) : (
              <><Trash2 size={13} strokeWidth={2} style={{ marginRight: '5px' }} /> Delete Row</>
            )}
          </button>
          <div className="modal-footer-right">
            <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button 
              className="btn-primary btn-sm" 
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              <Save size={13} strokeWidth={2} style={{ marginRight: '5px' }} /> 
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRowModal;
