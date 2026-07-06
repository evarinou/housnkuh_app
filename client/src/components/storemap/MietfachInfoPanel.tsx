/**
 * @file MietfachInfoPanel.tsx
 * @purpose Info panel (DOM, outside the canvas) for the selected Mietfach with vendor link
 * @created 2026-06-11
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Store } from 'lucide-react';
import TagBadge from '../ui/TagBadge';
import { resolveImageUrl } from '../../utils/imageUtils';
import { StoreMapMietfach } from './types';
import { TYP_COLORS } from './storeLayout';

interface MietfachInfoPanelProps {
  mietfach: StoreMapMietfach;
  onClose: () => void;
}

const MietfachInfoPanel: React.FC<MietfachInfoPanelProps> = ({ mietfach, onClose }) => {
  const typLabel = (TYP_COLORS[mietfach.typ] || TYP_COLORS.sonstiges).label;
  const vendor = mietfach.vendor;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 w-full max-w-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-secondary">{mietfach.bezeichnung}</h3>
          <p className="text-sm text-gray-500">{typLabel}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {vendor ? (
        <div>
          <div className="flex items-center gap-3 mb-3">
            {vendor.profilBild ? (
              <img
                src={resolveImageUrl(vendor.profilBild)}
                alt={vendor.unternehmen || vendor.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-medium text-secondary">{vendor.unternehmen || vendor.name}</p>
              {vendor.unternehmen && vendor.name && (
                <p className="text-sm text-gray-500">{vendor.name}</p>
              )}
            </div>
          </div>

          {vendor.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {vendor.tags.map((tag) => (
                <TagBadge key={tag.name} name={tag.name} color={tag.color} icon={tag.icon} />
              ))}
            </div>
          )}

          <Link
            to={`/direktvermarkter/${vendor.id}`}
            className="inline-block w-full text-center bg-primary text-white font-medium rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            Zum Profil
          </Link>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          {mietfach.belegt
            ? 'Dieses Fach ist belegt.'
            : 'Dieses Fach ist aktuell frei – interessiert? Melde dich bei uns!'}
        </p>
      )}
    </motion.div>
  );
};

export default MietfachInfoPanel;
