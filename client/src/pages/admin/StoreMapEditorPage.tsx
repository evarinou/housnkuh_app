/**
 * @file StoreMapEditorPage.tsx
 * @purpose Admin page: 2D drag&drop editor for Mietfach positions on the store map
 * @created 2026-06-11
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Save, Map } from 'lucide-react';
import { apiUtils, tokenStorage } from '../../utils/auth';
import StoreMapEditor from '../../components/admin/storemap/StoreMapEditor';
import EditorSidebar from '../../components/admin/storemap/EditorSidebar';
import { EditorItemData } from '../../components/admin/storemap/EditorItem';
import { defaultPosition } from '../../components/admin/storemap/storeMapEditorUtils';
import { MietfachPosition } from '../../components/storemap/types';

// Underlay zum Abpausen des Scans: PNG nach src/components/admin/storemap/ legen
// und hier importieren, z. B.: import underlay from '.../floorplan-underlay.png';
const UNDERLAY_URL: string | null = null;

/** Im Editor kann ein Mietfach noch unplatziert sein (position = null) */
type AdminMietfach = Omit<EditorItemData, 'position'> & { position: MietfachPosition | null };

const StoreMapEditorPage: React.FC = () => {
  const [items, setItems] = useState<AdminMietfach[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [underlayOpacity, setUnderlayOpacity] = useState(0.4);

  const authConfig = useMemo(
    () => apiUtils.createAuthConfig(tokenStorage.getToken('ADMIN') || ''),
    []
  );

  useEffect(() => {
    axios
      .get(`${apiUtils.getApiUrl()}/admin/store-map`, authConfig)
      .then((response) => {
        setItems(response.data?.mietfaecher || []);
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Mietfächer konnten nicht geladen werden.' });
        setLoading(false);
      });
  }, [authConfig]);

  // Warnung beim Verlassen mit ungespeicherten Änderungen
  useEffect(() => {
    if (dirtyIds.size === 0) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyIds]);

  const markDirty = (id: string) =>
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const handleChangePosition = useCallback((id: string, position: MietfachPosition) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, position } : item))
    );
    setRemovedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    markDirty(id);
  }, []);

  const handlePlace = (id: string) => {
    handleChangePosition(id, defaultPosition());
    setSelectedId(id);
  };

  const handleRemoveFromMap = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, position: null } : item))
    );
    setRemovedIds((prev) => new Set(prev).add(id));
    markDirty(id);
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const positions = Array.from(dirtyIds).map((id) => {
      const item = items.find((i) => i.id === id)!;
      return {
        mietfachId: id,
        position: removedIds.has(id) ? null : item.position
      };
    });

    try {
      await axios.patch(
        `${apiUtils.getApiUrl()}/admin/store-map/positions`,
        { positions },
        authConfig
      );
      setDirtyIds(new Set());
      setRemovedIds(new Set());
      setMessage({ type: 'success', text: 'Positionen gespeichert.' });
    } catch {
      setMessage({ type: 'error', text: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' });
    } finally {
      setSaving(false);
    }
  };

  const positioned = items.filter((item): item is AdminMietfach & EditorItemData => !!item.position);
  const unpositioned = items.filter((item) => !item.position);
  const selected = positioned.find((item) => item.id === selectedId) || null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Map className="w-6 h-6 text-primary" /> Ladenkarte
          </h1>
          <p className="text-sm text-gray-500">
            Mietfächer per Drag&nbsp;&amp;&nbsp;Drop auf dem Grundriss platzieren (Raster 0,1&nbsp;m).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span
              className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
            >
              {message.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || dirtyIds.size === 0}
            className="inline-flex items-center gap-2 bg-primary text-white font-medium rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Speichert…' : `Speichern (${dirtyIds.size})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <div className="aspect-[5/4] max-h-[70vh]">
              <StoreMapEditor
                items={positioned}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChangePosition={handleChangePosition}
                underlayUrl={UNDERLAY_URL}
                underlayOpacity={underlayOpacity}
              />
            </div>
            {UNDERLAY_URL && (
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                Scan-Transparenz
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={underlayOpacity}
                  onChange={(event) => setUnderlayOpacity(parseFloat(event.target.value))}
                />
              </label>
            )}
          </div>

          <EditorSidebar
            unpositioned={unpositioned}
            selected={selected}
            onPlace={handlePlace}
            onChangePosition={handleChangePosition}
            onRemoveFromMap={handleRemoveFromMap}
          />
        </div>
      )}
    </div>
  );
};

export default StoreMapEditorPage;
